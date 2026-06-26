import Link from "next/link";
import { ShoppingBag, TrendingUp, CheckCircle2, Wallet, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { getOrders } from "@/lib/db/orders";
import type { OrderWithRelations } from "@/lib/db/types";
import { gbp } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "6m", label: "6 months", days: 180 },
  { key: "all", label: "All time", days: null },
] as const;

/** Vertical bar chart (CSS). */
function BarChart({
  data,
  color = "var(--brand)",
  format,
}: {
  data: { label: string; value: number }[];
  color?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max((d.value / max) * 100, 2)}%`,
                backgroundColor: color,
              }}
              title={format ? format(d.value) : String(d.value)}
            />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Donut({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="20" />
          {total > 0 &&
            data.map((d) => {
              const len = (d.value / total) * c;
              const seg = (
                <circle
                  key={d.label}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="20"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-foreground">
            {total}
          </span>
          <span className="text-[11px] text-muted-foreground">orders</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-1">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-medium text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopEmployees({ data }: { data: { name: string; closed: number }[] }) {
  const max = Math.max(1, ...data.map((e) => e.closed));
  return (
    <ul className="space-y-3.5">
      {data.map((e) => (
        <li key={e.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{e.name}</span>
            <span className="text-muted-foreground">{e.closed} completed</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(e.closed / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---- aggregation helpers ----

function lastSixMonths() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-GB", { month: "short" }),
    });
  }
  return out;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[2]; // default 6 months

  const allOrders: OrderWithRelations[] = await getOrders();
  const orders =
    range.days == null
      ? allOrders
      : allOrders.filter((o) => {
          const ageDays =
            (Date.now() - new Date(o.created_at).getTime()) / 86_400_000;
          return ageDays <= range.days!;
        });

  const hasData = orders.length > 0;

  // Revenue = EARNED revenue: completed sales only. Active orders (new /
  // in_progress) are pipeline (not yet earned) and cancelled orders never
  // earn — both excluded.
  const closedOrders = orders.filter((o) => o.status === "completed");

  const months = lastSixMonths();
  const ordersOverTime = months.map((m) => ({
    label: m.label,
    value: orders.filter((o) => monthKey(o.created_at) === m.key).length,
  }));
  const revenueByMonth = months.map((m) => ({
    label: m.label,
    value: closedOrders
      .filter((o) => monthKey(o.created_at) === m.key)
      .reduce((s, o) => s + (o.selling_price ?? 0), 0),
  }));

  const statusData = [
    { label: "New", value: orders.filter((o) => o.status === "new").length, color: "#1E3A5F" },
    { label: "In progress", value: orders.filter((o) => o.status === "in_progress").length, color: "#F97316" },
    { label: "Completed", value: orders.filter((o) => o.status === "completed").length, color: "#10B981" },
    { label: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length, color: "#F43F5E" },
  ];

  const closedByEmployee = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== "completed") continue;
    const name = o.created_by_profile?.full_name ?? "Unassigned";
    closedByEmployee.set(name, (closedByEmployee.get(name) ?? 0) + 1);
  }
  const topEmployees = [...closedByEmployee.entries()]
    .map(([name, closed]) => ({ name, closed }))
    .sort((a, b) => b.closed - a.closed)
    .slice(0, 5);

  const totalRevenue = closedOrders.reduce(
    (s, o) => s + (o.selling_price ?? 0),
    0
  );
  const closedCount = closedOrders.length;
  const avgOrderValue = closedOrders.length
    ? Math.round(totalRevenue / closedOrders.length)
    : 0;
  const closedRate = hasData
    ? Math.round((closedCount / orders.length) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Performance across orders, revenue and your team."
        actions={
          <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin/analytics?range=${r.key}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  r.key === range.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={String(orders.length)} icon={ShoppingBag} />
        <StatCard label="Revenue (completed)" value={gbp(totalRevenue)} icon={Wallet} />
        <StatCard label="Avg completed order" value={gbp(avgOrderValue)} icon={TrendingUp} />
        <StatCard label="Completion rate" value={`${closedRate}%`} icon={CheckCircle2} />
      </div>

      {!hasData ? (
        <SectionCard title="No data yet">
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <BarChart3 className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              Nothing to chart yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once your team starts creating orders, trends, revenue and
              leaderboards will show up here.
            </p>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard title="Orders over time" description="Monthly order volume">
              <BarChart data={ordersOverTime} />
            </SectionCard>
            <SectionCard title="Revenue by month" description="Completed revenue (GBP)">
              <BarChart
                data={revenueByMonth}
                color="var(--navy)"
                format={(v) => gbp(v)}
              />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard title="Orders by status">
              <Donut data={statusData} />
            </SectionCard>
            <SectionCard title="Top employees" description="By completed orders">
              {topEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No completed orders yet.
                </p>
              ) : (
                <TopEmployees data={topEmployees} />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
