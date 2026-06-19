"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerByProfileId } from "@/lib/db/customers";
import { getOrdersForCustomer } from "@/lib/db/orders";
import { getMessages } from "@/lib/db/messages";
import type {
  Order,
  Message,
  ConversationWithCustomer,
  Customer,
} from "@/lib/db/types";

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
const CUSTOMER_COLUMNS = "id, profile_id, wa_phone, name, created_at";

/**
 * Resolve the customer row for the current session, creating it if missing.
 * Signup normally links a customers row (api/signup-profile), but that step is
 * best-effort — if it ever failed, the portal would be dead-on-arrival. So we
 * self-heal here with the service-role client AFTER confirming an authenticated
 * session, keyed to the user's own profile_id (never anyone else's).
 */
async function ensureCustomer(): Promise<{
  userId: string;
  customer: Customer;
}> {
  const { user, profile } = await getUserAndProfile();
  if (!user) throw new Error("Unauthorized");
  // Role guard: these actions are the customer portal's only. Reject staff
  // sessions so an employee/admin can't auto-provision a customers row for
  // themselves (ensureCustomer) or otherwise drive the customer flow.
  if (profile?.role !== "customer") throw new Error("Unauthorized");

  const existing = await getCustomerByProfileId(user.id);
  if (existing) return { userId: user.id, customer: existing };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert({ profile_id: user.id, name: profile?.full_name ?? null, wa_phone: null })
    .select(CUSTOMER_COLUMNS)
    .single<Customer>();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not set up your customer record.");
  }
  return { userId: user.id, customer: data };
}

/**
 * The customer's conversation id, creating one if they have none yet. A portal
 * customer starts with no conversation (only inbound WhatsApp / the dev tools
 * created them before), so without this their Messages tab had nothing to write
 * into. Service-role insert, keyed to a customer row we've already confirmed the
 * caller owns — admins/employees then see it through normal RLS.
 */
async function ensureConversation(customerId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("customer_id", customerId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("conversations")
    .insert({ customer_id: customerId, status: "open" })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) {
    throw new Error(error?.message ?? "Could not start your conversation.");
  }
  return created.id;
}

// ----- Orders -----

export async function listMyCustomerOrders(): Promise<Order[]> {
  const { customer } = await ensureCustomer();
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
  let conversationId: string;
  try {
    const ctx = await ensureCustomer();
    customerId = ctx.customer.id;
    // Tie the quote to the customer's conversation so the assigned employee sees
    // it in context (and so a conversation_id NOT NULL constraint can't bite).
    conversationId = await ensureConversation(customerId);
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
    conversation_id: conversationId,
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

/**
 * The customer's own conversation + its messages. A conversation is created on
 * first visit if they don't have one, so the Messages composer is always live.
 */
export async function getMyThread(): Promise<CustomerThread> {
  const { customer } = await ensureCustomer();
  await ensureConversation(customer.id);

  const supabase = await createClient();
  // owns_conversation RLS restricts this to the caller's own conversation(s).
  const { data: conv, error } = await supabase
    .from("conversations")
    .select("id, customer_id, status, last_message_at, created_at, customer:customers(id, name, wa_phone)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<ConversationWithCustomer>();

  if (error) throw error;
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
  conversationId?: string;
  body: string;
  mediaUrl?: string | null;
}): Promise<ActionResult<Message>> {
  let conversationId: string;
  try {
    const { customer } = await ensureCustomer();
    // Fall back to (or create) the customer's conversation if the client didn't
    // pass one — guarantees the message always has a home.
    conversationId = input.conversationId || (await ensureConversation(customer.id));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const body = input.body.trim();
  if (!body && !input.mediaUrl) return { ok: false, error: "Message is empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
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
