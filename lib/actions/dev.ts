"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversationsOverview, type ConversationOverview } from "@/lib/db/conversations";
import { getEmployees } from "@/lib/db/profiles";
import type { Profile } from "@/lib/db/types";

/**
 * Admin-only conversation-routing tools. Messaging is fully internal (Supabase
 * Realtime between admin / employee / customer), so there is no mock "incoming
 * message" injection — customers send their own messages from the portal. These
 * helpers let an admin route a conversation to an employee so it lands in that
 * employee's live inbox.
 *
 * Writes use the service-role client (bypasses RLS) AFTER an explicit admin
 * check — the same pattern as lib/actions/admin.ts.
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

// Idempotent assignment insert.
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
