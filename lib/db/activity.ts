import { createClient } from "@/lib/supabase/server";

/**
 * A unified recent-activity feed for the admin dashboard, merged from real
 * events across orders, messages and assignments. Admin RLS lets these reads
 * see every row; we fetch a small slice of each, merge, and keep the newest.
 *
 * The shape mirrors the design's activity line — **actor** verb [record] —
 * rather than a title/detail pair, so the feed reads as a sentence.
 */

export type ActivityKind = "order" | "message" | "assignment";
/** Dot tint, matching the design's `tint(kind)[1]` ramp. */
export type ActivityTone = "marine" | "ember" | "success" | "ink";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  tone: ActivityTone;
  actor: string;
  verb: string;
  record: string;
  at: string;
  link: string;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  customer: { name: string | null } | null;
  created_by_profile: { full_name: string | null } | null;
  assigned_employee: { full_name: string | null } | null;
};

type MessageRow = {
  id: string;
  direction: string;
  created_at: string;
  conversation: { id: string; customer: { name: string | null } | null } | null;
};

type AssignmentRow = {
  id: string;
  created_at: string;
  employee: { full_name: string | null } | null;
  conversation: { id: string; customer: { name: string | null } | null } | null;
};

export async function getRecentActivity(
  limit = 7
): Promise<{ items: ActivityItem[]; total: number }> {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [ordersRes, messagesRes, assignmentsRes, oc, mc, ac] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, status, created_at, closed_at, customer:customers(name), created_by_profile:profiles!created_by(full_name), assigned_employee:profiles!assigned_employee_id(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<OrderRow[]>(),
    supabase
      .from("messages")
      .select(
        "id, direction, created_at, conversation:conversations(id, customer:customers(name))"
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<MessageRow[]>(),
    supabase
      .from("assignments")
      .select(
        "id, created_at, employee:profiles(full_name), conversation:conversations(id, customer:customers(name))"
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<AssignmentRow[]>(),
    supabase.from("orders").select("id", head).then((r) => r.count ?? 0),
    supabase.from("messages").select("id", head).then((r) => r.count ?? 0),
    supabase.from("assignments").select("id", head).then((r) => r.count ?? 0),
  ]);

  const items: ActivityItem[] = [];

  for (const o of ordersRes.data ?? []) {
    const ref = o.order_number ? `#${o.order_number.replace(/^#/, "")}` : "an order";
    const done = o.status === "completed";
    items.push({
      id: `order-${o.id}`,
      kind: "order",
      tone: done ? "success" : o.status === "cancelled" ? "ink" : "marine",
      actor:
        o.created_by_profile?.full_name ??
        o.customer?.name ??
        "A customer",
      verb: done
        ? "marked completed"
        : o.status === "cancelled"
          ? "cancelled"
          : "placed a new order",
      record: ref,
      at: o.created_at,
      link: `/admin/orders/${o.id}`,
    });
  }

  for (const m of messagesRes.data ?? []) {
    const name = m.conversation?.customer?.name ?? "A customer";
    const incoming = m.direction === "incoming";
    items.push({
      id: `message-${m.id}`,
      kind: "message",
      tone: "ember",
      actor: incoming ? name : "The team",
      verb: incoming ? "sent a message in" : "replied in",
      record: incoming ? "their conversation" : `${name}'s conversation`,
      at: m.created_at,
      link: m.conversation?.id
        ? `/admin/messages?c=${m.conversation.id}`
        : "/admin/messages",
    });
  }

  for (const a of assignmentsRes.data ?? []) {
    items.push({
      id: `assignment-${a.id}`,
      kind: "assignment",
      tone: "ember",
      actor: a.employee?.full_name ?? "An employee",
      verb: "was assigned",
      record: `${a.conversation?.customer?.name ?? "a customer"}'s conversation`,
      at: a.created_at,
      link: a.conversation?.id
        ? `/admin/messages?c=${a.conversation.id}`
        : "/admin/messages",
    });
  }

  return {
    items: items
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
      .slice(0, limit),
    total: oc + mc + ac,
  };
}
