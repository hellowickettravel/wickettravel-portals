import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MessageSquare,
  Plane,
  ShoppingBag,
  UserCheck,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getOrders } from "@/lib/db/orders";
import { getRecentActivity } from "@/lib/db/activity";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { OrdersTable } from "@/components/admin/orders-table";
import { EmptyState } from "@/components/portal/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { gbp, fmtDate, fmtRelative, num } from "@/lib/format";

function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

/** Activity hue by what happened, not by position in the list. */
const ACTIVITY_TONE = {
  order: "ocean",
  message: "violet",
  assignment: "jade",
} as const;

const ACTIVITY_ICON = {
  order: Plane,
  message: MessageSquare,
  assignment: UserCheck,
} as const;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [orders, employeesCount, conversationsCount, activity] = await Promise.all([
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
    getRecentActivity(8),
  ]);

  const openOrders = orders.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  ).length;
  // Commission realised this month = completed orders whose closed_at falls in
  // the current month (not creation date), so the figure tracks when revenue lands.
  const commissionThisMonth = orders
    .filter((o) => o.status === "completed" && o.closed_at != null && isThisMonth(o.closed_at))
    .reduce((sum, o) => sum + (o.commission ?? 0), 0);

  const totalOrderValue = orders.reduce((s, o) => s + (o.selling_price ?? 0), 0);

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer?.name ?? null,
    routeFrom: o.route_from,
    routeTo: o.route_to,
    status: o.status,
    sellingPrice: o.selling_price,
    createdAt: o.created_at,
  }));

  return (
    /* Portal section rhythm: 72px between blocks, 32px from the head to the
       first thing under it (DESIGN_SYSTEM.md §6, §12). */
    <div className="space-y-18">
      <div className="space-y-8">
        <PageHeader
        eyebrow={`${num(openOrders)} open · ${fmtDate(new Date().toISOString())}`}
        title="Admin dashboard"
        subtitle="A snapshot of your team, your orders and everything still waiting on a reply."
          actions={
            <Button render={<Link href="/admin/orders" />}>
              <ShoppingBag />
              View all orders
            </Button>
          }
        />

        {/* ---------- 4-up: the numbers, each in the hue of what it means ---------- */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            tone="violet"
            icon={Clock}
            label="Open orders"
            value={num(openOrders)}
            hint="new and in progress"
          />
          <StatCard
            tone="gold"
            icon={Wallet}
            label="Commission this month"
            value={gbp(commissionThisMonth)}
            hint="from completed orders"
          />
          <StatCard
            tone="ocean"
            icon={MessageSquare}
            label="Conversations"
            value={num(conversationsCount)}
            hint="total threads"
          />
          <StatCard
            tone="jade"
            icon={UserCheck}
            label="Employees"
            value={num(employeesCount)}
            hint="active team members"
          />
        </div>
      </div>

      {/* ---------- Wide single: the table gets the full measure ---------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-micro text-flame">Latest five</p>
            <h2 className="mt-2 text-[25px] leading-[1.26] font-bold tracking-[-0.01em] text-tx-head">
              Recent orders
            </h2>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-chip text-[14.5px] font-semibold text-ocean underline-offset-[3px] outline-none transition-colors duration-150 ease-brand hover:text-ocean-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
          >
            View all orders
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <OrdersTable
          rows={recentOrders}
          caption="The five most recent orders"
          empty={{
            title: "No orders yet",
            description: "They'll appear here as your team creates them.",
          }}
        />
      </section>

      {/* ---------- 2-up: a feed beside the book of business ---------- */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                title="Nothing has happened yet"
                description="Orders, messages and assignments show up here as they land."
                className="py-8"
              />
            ) : (
              <ol className="space-y-4">
                {activity.map((a) => {
                  const Icon = ACTIVITY_ICON[a.kind];
                  return (
                    <li key={a.id}>
                      <Link
                        href={a.link}
                        className="group flex gap-3 rounded-chip outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                      >
                        <IconChip
                          tone={ACTIVITY_TONE[a.kind]}
                          className="size-9 rounded-chip [&_svg]:size-4"
                        >
                          <Icon />
                        </IconChip>
                        <div className="min-w-0 flex-1 leading-snug">
                          <p className="text-[14.5px] font-medium text-tx-body transition-colors duration-150 ease-brand group-hover:text-ocean">
                            {a.title}
                          </p>
                          <p className="truncate text-[13px] text-tx-faint">
                            {a.detail} · {fmtRelative(a.at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* The three running totals, on a sky band so the pair reads as one
            block rather than as two more white cards. */}
        <Card size="sm" className="border-sky-line bg-sky-tint shadow-none">
          <CardHeader>
            <CardTitle>Book of business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total orders", value: num(orders.length) },
              { label: "Total order value", value: gbp(totalOrderValue) },
              { label: "Conversations", value: num(conversationsCount) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 rounded-chip border border-sky-line bg-surface px-4 py-3"
              >
                <span className="font-micro text-tx-faint">{row.label}</span>
                <span className="tabular text-[19px] font-bold tracking-[-0.005em] text-tx-head">
                  {row.value}
                </span>
              </div>
            ))}
            <p className="pt-1 text-[13px] text-tx-muted">
              Last updated {fmtDate(new Date().toISOString())}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
