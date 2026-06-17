import Link from "next/link";
import {
  Users,
  ShoppingBag,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrders } from "@/lib/db/orders";
import type { OrderStatus } from "@/lib/db/types";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gbp, fmtDate, fmtRelative, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "blue",
  closed: "green",
  cancelled: "red",
};

function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [orders, employeesCount, conversationsCount] = await Promise.all([
    getOrders(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "employee")
      .then((r) => r.count ?? 0),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
  ]);

  const openOrders = orders.filter((o) => o.status === "open").length;
  const commissionThisMonth = orders
    .filter((o) => o.status === "closed" && isThisMonth(o.created_at))
    .reduce((sum, o) => sum + (o.commission ?? 0), 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        subtitle="A snapshot of your team, orders and conversations."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={String(employeesCount)} icon={Users} hint="active team members" />
        <StatCard label="Open Orders" value={String(openOrders)} icon={ShoppingBag} hint="awaiting close" />
        <StatCard label="Conversations" value={String(conversationsCount)} icon={MessageSquare} hint="total threads" />
        <StatCard label="Commission (this month)" value={gbp(commissionThisMonth)} icon={TrendingUp} hint="from closed orders" />
      </div>

      {/* Recent orders + activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title="Recent Orders"
          className="lg:col-span-2"
          flush
          action={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No orders yet. They’ll appear here as your team creates them.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6 font-medium text-navy">
                      #{o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{o.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.route_from ?? "—"} → {o.route_to ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {o.selling_price != null ? gbp(o.selling_price) : "—"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge tone={ORDER_TONE[o.status]}>
                        {titleCase(o.status)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard title="Recent Activity">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-4">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      o.status === "closed"
                        ? "bg-emerald-500"
                        : o.status === "cancelled"
                          ? "bg-rose-500"
                          : "bg-brand"
                    }`}
                  />
                  <div className="leading-snug">
                    <p className="text-sm text-foreground">
                      Order #{o.id.slice(0, 8)} · {titleCase(o.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.route_from ?? "—"} → {o.route_to ?? "—"} ·{" "}
                      {fmtRelative(o.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* Conversations overview */}
      <SectionCard title="Conversations overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-chip text-brand-dark">
              <Inbox className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {conversationsCount}
              </p>
              <p className="text-xs text-muted-foreground">Total conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {orders.length}
              </p>
              <p className="text-xs text-muted-foreground">Total orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {gbp(orders.reduce((s, o) => s + (o.selling_price ?? 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total order value</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated {fmtDate(new Date().toISOString())}.
        </p>
      </SectionCard>
    </div>
  );
}
