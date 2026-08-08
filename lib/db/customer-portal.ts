import { createClient } from "@/lib/supabase/server";
import { getCustomerByProfileId } from "@/lib/db/customers";

export type CustomerNavCounts = {
  /** Orders still moving — new or in progress. */
  orders: number;
  /** Team replies that landed after the customer's own last message. */
  messages: number;
};

/**
 * The warm figures on the customer's sidebar. Read-only and RLS-scoped: unlike
 * the customer server actions this never provisions a customers row or a
 * conversation, because a nav count must not have side effects on every page
 * render.
 *
 * There is no per-customer read receipt in the schema, so "unread" is measured
 * the same way the admin inbox measures it — messages from the other side that
 * arrived after your own last one. Same precedent, opposite direction.
 */
export async function getCustomerNavCounts(
  profileId: string
): Promise<CustomerNavCounts> {
  const empty: CustomerNavCounts = { orders: 0, messages: 0 };

  const customer = await getCustomerByProfileId(profileId).catch(() => null);
  if (!customer) return empty;

  const supabase = await createClient();

  const [{ count: orders }, { data: conv }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .in("status", ["new", "in_progress"]),
    supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", customer.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ]);

  let messages = 0;
  if (conv?.id) {
    // The customer's own messages are stored 'incoming' (inbound to the
    // business); the team's replies are 'outgoing'.
    const { data: mine } = await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conv.id)
      .eq("direction", "incoming")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>();

    let q = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id)
      .eq("direction", "outgoing");
    if (mine?.created_at) q = q.gt("created_at", mine.created_at);

    const { count } = await q;
    messages = count ?? 0;
  }

  return { orders: orders ?? 0, messages };
}
