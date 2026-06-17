"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerByProfileId } from "@/lib/db/customers";
import { getOrdersForCustomer } from "@/lib/db/orders";
import { getMessages } from "@/lib/db/messages";
import type { Order, Message, ConversationWithCustomer } from "@/lib/db/types";

/**
 * Customer-portal server actions. The signed-in user is linked to a customers
 * row via customers.profile_id = auth.uid(). Reads run under RLS
 * (orders_select_customer / owns_conversation / messages_select_customer).
 */

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, created_at";

/** Resolve the customer row for the current session, or throw. */
async function requireCustomer() {
  const { user } = await getUserAndProfile();
  if (!user) throw new Error("Unauthorized");
  const customer = await getCustomerByProfileId(user.id);
  if (!customer) throw new Error("No customer record linked to this account.");
  return { userId: user.id, customer };
}

// ----- Orders -----

export async function listMyCustomerOrders(): Promise<Order[]> {
  const { customer } = await requireCustomer();
  return getOrdersForCustomer(customer.id);
}

/**
 * Book-a-Flight = create a quote-request order for the signed-in customer.
 * Customers have no orders-insert RLS policy, so this inserts via the
 * SERVICE-ROLE client AFTER verifying (above) that the session user owns the
 * customer row. created_by stays null (customer-created, not staff).
 */
export async function createQuoteRequest(input: {
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  passengers: number | null;
  notes: string | null;
}): Promise<ActionResult> {
  let customerId: string;
  try {
    const ctx = await requireCustomer();
    customerId = ctx.customer.id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Please tell us where you're flying from and to." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("orders").insert({
    customer_id: customerId,
    route_from: routeFrom,
    route_to: routeTo,
    travel_date: input.travelDate,
    return_date: input.returnDate,
    passengers: input.passengers,
    notes: input.notes?.trim() || null,
    status: "open",
    created_by: null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----- Messages (portal mirror of the WhatsApp chat) -----

export type CustomerThread = {
  conversation: ConversationWithCustomer | null;
  messages: Message[];
};

/** The customer's own conversation + its messages (or nulls if none yet). */
export async function getMyThread(): Promise<CustomerThread> {
  await requireCustomer();
  const supabase = await createClient();

  // owns_conversation RLS restricts this to the caller's own conversation(s).
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, customer_id, status, last_message_at, created_at, customer:customers(id, name, wa_phone)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<ConversationWithCustomer>();

  if (!conv) return { conversation: null, messages: [] };

  const messages = await getMessages(conv.id);
  return { conversation: conv, messages };
}

/**
 * Customer sends a message into their own conversation. From the business's
 * perspective this is INBOUND, so direction='incoming' with no sender_id —
 * matches the messages_insert_customer policy. MOCK: saved to DB only.
 */
export async function sendCustomerMessage(input: {
  conversationId: string;
  body: string;
  mediaUrl?: string | null;
}): Promise<ActionResult<Message>> {
  try {
    await requireCustomer();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const body = input.body.trim();
  if (!body && !input.mediaUrl) return { ok: false, error: "Message is empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      direction: "incoming",
      body: body || "",
      media_url: input.mediaUrl ?? null,
      sender_id: null,
    })
    .select(MESSAGE_COLUMNS)
    .single<Message>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
