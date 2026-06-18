import { createClient } from "@/lib/supabase/server";

/**
 * A unified recent-activity feed for the admin dashboard, merged from real
 * events across orders, messages and assignments. Admin RLS lets these reads
 * see every row; we fetch a small slice of each, merge, and keep the newest.
 */

export type ActivityKind = "order" | "message" | "assignment";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  link: string;
};

type OrderRow = {
  id: string;
  route_from: string | null;
  route_to: string | null;
  status: string;
  created_at: string;
  customer: { name: string | null } | null;
};

type MessageRow = {
  id: string;
  direction: string;
  body: string | null;
  created_at: string;
  conversation: { customer: { name: string | null } | null } | null;
};

type AssignmentRow = {
  id: string;
  created_at: string;
  employee: { full_name: string | null } | null;
  conversation: { customer: { name: string | null } | null } | null;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const [ordersRes, messagesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, route_from, route_to, status, created_at, customer:customers(name)")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<OrderRow[]>(),
    supabase
      .from("messages")
      .select("id, direction, body, created_at, conversation:conversations(customer:customers(name))")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<MessageRow[]>(),
    supabase
      .from("assignments")
      .select("id, created_at, employee:profiles(full_name), conversation:conversations(customer:customers(name))")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<AssignmentRow[]>(),
  ]);

  const items: ActivityItem[] = [];

  for (const o of ordersRes.data ?? []) {
    items.push({
      id: `order-${o.id}`,
      kind: "order",
      title: `New order · ${o.status}`,
      detail: `${o.customer?.name ?? "Customer"} · ${o.route_from ?? "—"} → ${o.route_to ?? "—"}`,
      at: o.created_at,
      link: `/admin/orders/${o.id}`,
    });
  }

  for (const m of messagesRes.data ?? []) {
    const name = m.conversation?.customer?.name ?? "Customer";
    const incoming = m.direction === "incoming";
    items.push({
      id: `message-${m.id}`,
      kind: "message",
      title: incoming ? `Message from ${name}` : `Reply to ${name}`,
      detail: (m.body ?? "").slice(0, 80) || "Attachment",
      at: m.created_at,
      link: "/admin/messages",
    });
  }

  for (const a of assignmentsRes.data ?? []) {
    items.push({
      id: `assignment-${a.id}`,
      kind: "assignment",
      title: "Conversation assigned",
      detail: `${a.employee?.full_name ?? "Employee"} · ${a.conversation?.customer?.name ?? "Customer"}`,
      at: a.created_at,
      link: "/admin/messages",
    });
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit);
}
