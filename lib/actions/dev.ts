"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversationsOverview, type ConversationOverview } from "@/lib/db/conversations";
import { getEmployees } from "@/lib/db/profiles";
import type { Profile } from "@/lib/db/types";

/**
 * Admin-only DEV / mock-messaging tools. Since WhatsApp Cloud API is not wired
 * yet, these let an admin inject fake inbound customer messages and assign
 * conversations to employees so the live inbox can be tested end-to-end.
 *
 * Writes use the service-role client (bypasses RLS) AFTER an explicit admin
 * check — the same pattern as lib/actions/admin.ts. Incoming messages have no
 * authenticated author, so a service-role insert is the natural fit (and mirrors
 * how the real webhook will write inbound messages in Batch 6).
 */

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

// ----- Reads for the admin tools UI -----

export async function listEmployeesForTools(): Promise<Profile[]> {
  await requireAdmin();
  return getEmployees();
}

export async function listConversationsForTools(): Promise<ConversationOverview[]> {
  await requireAdmin();
  return getConversationsOverview();
}

// ----- Writes -----

/**
 * Inject a fake INBOUND customer message:
 *   1. upsert the customer by wa_phone (create if new)
 *   2. reuse their latest conversation, or create one
 *   3. insert a message with direction='incoming'
 *   4. (optional) assign the conversation to an employee so it shows in an inbox
 * The 0005 trigger bumps conversations.last_message_at, and Realtime pushes the
 * change to the assigned employee live.
 */
export async function simulateIncoming(input: {
  customerName: string;
  waPhone: string;
  body: string;
  assignToEmployeeId?: string | null;
}): Promise<ActionResult<{ conversationId: string }>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const name = input.customerName.trim();
  const phone = input.waPhone.trim();
  const body = input.body.trim();
  if (!phone) return { ok: false, error: "A WhatsApp phone number is required." };
  if (!body) return { ok: false, error: "Message body is required." };

  const admin = createAdminClient();

  // 1) Find or create the customer by phone.
  const { data: existingCustomer, error: findErr } = await admin
    .from("customers")
    .select("id")
    .eq("wa_phone", phone)
    .maybeSingle<{ id: string }>();
  if (findErr) return { ok: false, error: findErr.message };

  let customerId = existingCustomer?.id;
  if (!customerId) {
    const { data: created, error: custErr } = await admin
      .from("customers")
      .insert({ wa_phone: phone, name: name || phone })
      .select("id")
      .single<{ id: string }>();
    if (custErr || !created)
      return { ok: false, error: custErr?.message ?? "Could not create customer." };
    customerId = created.id;
  } else if (name) {
    // Keep the name fresh if one was provided.
    await admin.from("customers").update({ name }).eq("id", customerId);
  }

  // 2) Reuse the latest conversation for this customer, or create one.
  const { data: existingConv } = await admin
    .from("conversations")
    .select("id")
    .eq("customer_id", customerId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  let conversationId = existingConv?.id;
  if (!conversationId) {
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .insert({ customer_id: customerId, status: "open" })
      .select("id")
      .single<{ id: string }>();
    if (convErr || !conv)
      return { ok: false, error: convErr?.message ?? "Could not create conversation." };
    conversationId = conv.id;
  }

  // 3) Insert the inbound message (no authenticated sender).
  const { error: msgErr } = await admin.from("messages").insert({
    conversation_id: conversationId,
    direction: "incoming",
    body,
    sender_id: null,
  });
  if (msgErr) return { ok: false, error: msgErr.message };

  // 4) Optionally assign so an employee actually sees it.
  if (input.assignToEmployeeId) {
    const assignRes = await assignConversationInternal(
      admin,
      conversationId,
      input.assignToEmployeeId
    );
    if (!assignRes.ok) return assignRes;
  }

  return { ok: true, data: { conversationId } };
}

/** Assign a conversation to an employee (admin control for the inbox). */
export async function assignConversation(input: {
  conversationId: string;
  employeeId: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const admin = createAdminClient();
  return assignConversationInternal(admin, input.conversationId, input.employeeId);
}

// Idempotent assignment insert shared by simulate + the explicit assign control.
async function assignConversationInternal(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  employeeId: string
): Promise<ActionResult> {
  const { data: existing } = await admin
    .from("assignments")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("employee_id", employeeId)
    .maybeSingle<{ id: string }>();

  if (existing) return { ok: true };

  const { error } = await admin
    .from("assignments")
    .insert({ conversation_id: conversationId, employee_id: employeeId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
