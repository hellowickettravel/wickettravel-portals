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
import { isMissingColumn } from "@/lib/db/errors";
import type {
  Message,
  OrderWithRelations,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/db/types";
import { normalizeOrderInput, type OrderFormInput } from "@/lib/orders/form";
import { LIMITS, sanitizeText } from "@/lib/security/limits";
import { tooManyRecentRows } from "@/lib/security/rate-limit";

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
  "id, conversation_id, direction, body, media_url, sender_id, reply_to_id, created_at";

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
 * Send an outgoing reply into a conversation. Messaging is fully internal:
 * the row is persisted and Supabase Realtime delivers it live to the customer
 * (and any other participant) in their portal — no external service involved.
 */
export async function sendMessage(input: {
  conversationId: string;
  body: string;
  mediaUrl?: string | null;
  replyToId?: string | null;
}): Promise<ActionResult<Message>> {
  const { userId, profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (isReadOnly(access)) {
    return { ok: false, error: "Read-only access — you can't send messages." };
  }

  const body = sanitizeText(input.body, LIMITS.MESSAGE_BODY).trim();
  if (!body && !input.mediaUrl) {
    return { ok: false, error: "Message is empty." };
  }

  // Per-sender flood guard.
  if (
    await tooManyRecentRows({
      table: "messages",
      column: "sender_id",
      value: userId,
      windowSec: 10,
      max: 15,
    })
  ) {
    return { ok: false, error: "You're sending messages too quickly — please slow down." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      direction: "outgoing",
      body: body || "",
      media_url: input.mediaUrl ?? null,
      sender_id: userId,
      reply_to_id: input.replyToId ?? null,
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
 * Create a full order from a chat (the shared Chunk 1 create-order form). Linked
 * to the conversation + its customer, with created_by = me. Blocked for view_only
 * (read-only) and chat_only (no orders). Returns the new order id so the UI can
 * route to its detail view.
 */
export async function createOrderFromChat(
  input: OrderFormInput & { conversationId: string; customerId: string }
): Promise<ActionResult<{ orderId: string }>> {
  const { userId, profile } = await requireUser();
  const access = normalizeAccess(profile?.access_level);
  if (!canCreateOrders(access)) {
    return { ok: false, error: "Your access level can't create orders." };
  }

  const normalized = normalizeOrderInput(input);
  if (!normalized.ok) return normalized;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      ...normalized.fields,
      conversation_id: input.conversationId,
      customer_id: input.customerId,
      created_by: userId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { orderId: data.id } };
}

const ORDER_STATUSES: OrderStatus[] = ["new", "in_progress", "completed", "cancelled"];

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
  // The 0021 fields. The employee portal renders the SAME edit sheet as
  // /admin, so it has to be able to save the same fields — without these the
  // airline, flight numbers, budget and payment selects were silently dropped
  // on save for every employee.
  airline?: string | null;
  flightNumbers?: string | null;
  budgetPerPerson?: number | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
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
  const base = {
    route_from: routeFrom,
    route_to: routeTo,
    travel_date: input.travelDate,
    return_date: input.returnDate,
    passengers: input.passengers,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
    commission: input.commission,
    notes: input.notes?.trim() || null,
  };
  const extended = {
    ...base,
    airline: input.airline?.trim() || null,
    flight_numbers: input.flightNumbers?.trim() || null,
    budget_per_person: input.budgetPerPerson ?? null,
    payment_method: input.paymentMethod ?? null,
    payment_status: input.paymentStatus ?? null,
  };

  let result = await supabase
    .from("orders")
    .update(extended)
    .eq("id", input.id)
    .select("id");

  // Migration 0021 not applied: save everything the database does understand
  // rather than failing the whole edit. Same contract as the admin action.
  if (result.error && isMissingColumn(result.error)) {
    result = await supabase
      .from("orders")
      .update(base)
      .eq("id", input.id)
      .select("id");
  }

  if (result.error) return { ok: false, error: result.error.message };
  if (!result.data || result.data.length === 0) {
    return { ok: false, error: "You can't edit this order." };
  }
  return { ok: true };
}

/**
 * Change an order's status. SEMI_ADMIN only. Stamps closed_at on completion and
 * clears it otherwise — consistent with the admin action.
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
      closed_at: input.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "You can't change this order." };
  }
  return { ok: true };
}
