"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInboxForEmployee, type InboxConversation } from "@/lib/db/conversations";
import { getMessages } from "@/lib/db/messages";
import { getMyVisibleOrders } from "@/lib/db/orders";
import {
  normalizeAccess,
  isReadOnly,
  canCreateOrders,
  canEditOrders,
} from "@/lib/access";
import type { Message, OrderWithRelations, OrderStatus } from "@/lib/db/types";

/**
 * Employee-scoped server actions. These run through the RLS-aware server client,
 * so the database (not just this code) enforces who can see/write what:
 *   - reads come back already scoped to the signed-in employee's assignments
 *   - message inserts match messages_insert_employee (assigned + outgoing + me)
 *   - order inserts match orders_insert_employee (assigned + created_by me)
 * Access-level gates (view_only / chat_only) are ALSO checked here so the UI
 * never even attempts a write the level forbids.
 */

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, created_at";

async function requireUser() {
  const { user, profile } = await getUserAndProfile();
  if (!user) throw new Error("Unauthorized");
  return { userId: user.id, profile };
}

// ----- Reads (consumed by TanStack Query on the client) -----

export async function listMyInbox(): Promise<InboxConversation[]> {
  const { userId } = await requireUser();
  return getInboxForEmployee(userId);
}

export async function listMyMessages(
  conversationId: string
): Promise<Message[]> {
  await requireUser();
  // RLS (messages_select_employee) limits this to assigned conversations.
  return getMessages(conversationId);
}

export async function listMyOrders(): Promise<OrderWithRelations[]> {
  await requireUser();
  return getMyVisibleOrders();
}

// ----- Writes -----

/**
 * MOCK SEND. Persists an outgoing reply to our DB only — nothing is sent to
 * Meta yet. When the WhatsApp Cloud API is wired (Batch 6) the real send call
 * — POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages — goes at
 * the marked spot below, before/around this insert.
 */
export async function sendMessage(input: {
  conversationId: string;
  body: string;
  mediaUrl?: string | null;
}): Promise<ActionResult<Message>> {
  const { userId, profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (isReadOnly(access)) {
    return { ok: false, error: "Read-only access — you can't send messages." };
  }

  const body = input.body.trim();
  if (!body && !input.mediaUrl) {
    return { ok: false, error: "Message is empty." };
  }

  const supabase = await createClient();

  // ────────────────────────────────────────────────────────────────────────
  // 🔌 REAL WHATSAPP CLOUD API CALL GOES HERE (Batch 6).
  // For now this is a MOCK send: we only write the row to our own DB and rely on
  // Supabase Realtime to reflect it. No outbound request leaves the building.
  // ────────────────────────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      direction: "outgoing",
      body: body || "",
      media_url: input.mediaUrl ?? null,
      sender_id: userId,
    })
    .select(MESSAGE_COLUMNS)
    .single<Message>();

  if (error) return { ok: false, error: error.message };

  // conversations.last_message_at is bumped by the DB trigger from 0005.
  return { ok: true, data };
}

/** Stamp the conversation as read up to now (clears its unread badge for me). */
export async function markConversationRead(
  conversationId: string
): Promise<ActionResult> {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("employee_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Create an order from a chat. Linked to the conversation + its customer, with
 * created_by = me. Blocked for view_only (read-only) and chat_only (no orders).
 */
export async function createOrderFromChat(input: {
  conversationId: string;
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
}): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (!canCreateOrders(access)) {
    return { ok: false, error: "Your access level can't create orders." };
  }

  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Both From and To are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    conversation_id: input.conversationId,
    customer_id: input.customerId,
    route_from: routeFrom,
    route_to: routeTo,
    travel_date: input.travelDate,
    return_date: input.returnDate,
    passengers: input.passengers,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
    commission: input.commission,
    notes: input.notes?.trim() || null,
    status: "open",
    created_by: userId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const ORDER_STATUSES: OrderStatus[] = ["open", "closed", "cancelled"];

/**
 * Edit an order's trip + pricing fields. SEMI_ADMIN only. RLS
 * (orders_update_employee) independently enforces semi_admin + visibility
 * (created_by me OR a conversation assigned to me); the empty-result check
 * surfaces a clean error if the row isn't editable by this caller.
 */
export async function updateEmployeeOrder(input: {
  id: string;
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  passengers: number | null;
  sellingPrice: number | null;
  costPrice: number | null;
  commission: number | null;
  notes: string | null;
}): Promise<ActionResult> {
  const { profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (!canEditOrders(access)) {
    return { ok: false, error: "Your access level can't edit orders." };
  }

  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Both From and To are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      route_from: routeFrom,
      route_to: routeTo,
      travel_date: input.travelDate,
      return_date: input.returnDate,
      passengers: input.passengers,
      selling_price: input.sellingPrice,
      cost_price: input.costPrice,
      commission: input.commission,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "You can't edit this order." };
  }
  return { ok: true };
}

/**
 * Change an order's status. SEMI_ADMIN only. Stamps closed_at on close and
 * clears it on reopen/cancel — consistent with the admin action.
 */
export async function setEmployeeOrderStatus(input: {
  id: string;
  status: OrderStatus;
}): Promise<ActionResult> {
  const { profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (!canEditOrders(access)) {
    return { ok: false, error: "Your access level can't change order status." };
  }
  if (!ORDER_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: input.status,
      closed_at: input.status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "You can't change this order." };
  }
  return { ok: true };
}
