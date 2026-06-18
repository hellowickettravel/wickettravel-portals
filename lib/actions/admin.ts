"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployees } from "@/lib/db/profiles";
import { getOrders } from "@/lib/db/orders";
import { getCustomers } from "@/lib/db/customers";
import { getMessages } from "@/lib/db/messages";
import {
  getConversationsOverview,
  type InboxConversation,
} from "@/lib/db/conversations";
import type {
  Profile,
  Customer,
  OrderWithRelations,
  OrderStatus,
  AccessLevel,
  Message,
  BusinessSettings,
} from "@/lib/db/types";

/**
 * Admin-only server actions. Reads run through the RLS-aware helpers (admin
 * policies grant all); privileged writes use the service-role client AFTER an
 * explicit admin check here, since service-role bypasses RLS.
 */

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, created_at";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const ACCESS_LEVELS: AccessLevel[] = ["full", "chat_only", "view_only"];

/** Throws if the caller isn't a signed-in admin. */
async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

// ----- Reads (consumed by TanStack Query on the client) -----

export async function listEmployees(): Promise<Profile[]> {
  await requireAdmin();
  return getEmployees();
}

export async function listOrders(): Promise<OrderWithRelations[]> {
  await requireAdmin();
  return getOrders();
}

/** Customers for the admin "New Order" picker (admin RLS sees all). */
export async function listCustomers(): Promise<Customer[]> {
  await requireAdmin();
  return getCustomers();
}

/**
 * Admin creates an order for any customer (standalone "New Order"). Inserted
 * through the RLS-aware client — orders_admin_all permits the write — with
 * created_by = the admin and no conversation_id (not tied to a chat).
 */
export async function createOrder(input: {
  customerId: string;
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  passengers: number | null;
  sellingPrice: number | null;
  costPrice: number | null;
  commission: number | null;
  notes: string | null;
  status: OrderStatus;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  if (!input.customerId) return { ok: false, error: "Please choose a customer." };
  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Both From and To are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    customer_id: input.customerId,
    conversation_id: null,
    route_from: routeFrom,
    route_to: routeTo,
    travel_date: input.travelDate,
    return_date: input.returnDate,
    passengers: input.passengers,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
    commission: input.commission,
    notes: input.notes?.trim() || null,
    status: input.status,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----- Writes (service-role) -----

export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  accessLevel: AccessLevel;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_PASSWORD)
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (!ACCESS_LEVELS.includes(input.accessLevel))
    return { ok: false, error: "Invalid access level." };

  const admin = createAdminClient();

  // 1) Create the auth user (confirmed so they can log in immediately).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the account.",
    };
  }

  // 2) The signup trigger creates a profile row; force it to an employee with
  //    the chosen access level. upsert covers the case where the trigger is off.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      role: "employee",
      access_level: input.accessLevel,
      full_name: fullName,
      email,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  return { ok: true };
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const admin = createAdminClient();

    // Hard block at the auth layer: a banned user can't sign in OR refresh their
    // access token, so even an existing session dies on the next token refresh —
    // not just our UI checks. Lifting the ban (`none`) restores login.
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: isActive ? "none" : "876000h", // ~100 years
    });
    if (banError) return { ok: false, error: banError.message };

    const { error } = await admin
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function setEmployeeAccess(
  id: string,
  accessLevel: AccessLevel
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!ACCESS_LEVELS.includes(accessLevel))
    return { ok: false, error: "Invalid access level." };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ access_level: accessLevel })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function updateEmployee(input: {
  id: string;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (!ACCESS_LEVELS.includes(input.accessLevel))
    return { ok: false, error: "Invalid access level." };

  try {
    const admin = createAdminClient();

    // Keep the auth login in sync — email + display name live on auth.users too.
    const { error: authError } = await admin.auth.admin.updateUserById(input.id, {
      email,
      user_metadata: { full_name: fullName },
    });
    if (authError) return { ok: false, error: authError.message };

    const { error } = await admin
      .from("profiles")
      .update({ full_name: fullName, email, access_level: input.accessLevel })
      .eq("id", input.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

// ----- Admin inbox (full access — admin RLS sees every conversation) -----

/**
 * Every conversation for the admin inbox, shaped like the employee inbox so the
 * shared <ConversationInbox> can render both. Admins aren't assignment-scoped
 * and there's no per-admin read tracking, so unreadCount is always 0.
 */
export async function listAdminInbox(): Promise<InboxConversation[]> {
  await requireAdmin();
  const overview = await getConversationsOverview();
  return overview.map((c) => ({
    ...c,
    unreadCount: 0,
    lastReadAt: null,
  }));
}

export async function listAdminMessages(
  conversationId: string
): Promise<Message[]> {
  await requireAdmin();
  // RLS messages_admin_all lets admins read any conversation.
  return getMessages(conversationId);
}

/**
 * MOCK SEND (admin). Persists an outgoing reply to our DB only — the real
 * WhatsApp Cloud API call lands here in Batch 6. Admins can reply in ANY
 * conversation; messages_admin_all permits the insert.
 */
export async function adminSendMessage(input: {
  conversationId: string;
  body: string;
  mediaUrl?: string | null;
}): Promise<DataResult<Message>> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const body = input.body.trim();
  if (!body && !input.mediaUrl) return { ok: false, error: "Message is empty." };

  const supabase = await createClient();

  // 🔌 REAL WHATSAPP CLOUD API CALL GOES HERE (Batch 6) — mock save for now.
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      direction: "outgoing",
      body: body || "",
      media_url: input.mediaUrl ?? null,
      sender_id: user.id,
    })
    .select(MESSAGE_COLUMNS)
    .single<Message>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// ----- Business settings -----

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select(
      "id, business_name, business_email, business_phone, business_address, default_commission, logo_url, updated_at"
    )
    .eq("id", 1)
    .maybeSingle<BusinessSettings>();

  if (error) throw error;
  return data ?? null;
}

export async function saveBusinessSettings(input: {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  defaultCommission: number | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (input.businessEmail && !EMAIL_RE.test(input.businessEmail.trim())) {
    return { ok: false, error: "Enter a valid business email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").upsert(
    {
      id: 1,
      business_name: input.businessName.trim() || null,
      business_email: input.businessEmail.trim() || null,
      business_phone: input.businessPhone.trim() || null,
      business_address: input.businessAddress.trim() || null,
      default_commission: input.defaultCommission,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
