import Link from "next/link";
import { ShoppingBag, TrendingUp, CheckCircle2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/ui";
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

/**
 * The design's column chart: a four-line grid behind the plot, a value chip
 * floating above each column, and the current (right-most, still-in-progress)
 * period picked out in ember while every settled period stays marine.
 */
function BarChart({
  data,
  color = "var(--color-marine-500)",
  format,
}: {
  data: { label: string; value: number }[];
  color?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = format ?? ((v: number) => String(v));
  // Four axis stops from max down to zero, matching the four grid rules.
  const axis = [1, 0.75, 0.5, 0.25, 0].map((f) => fmt(Math.round(max * f)));

  return (
    <div className="flex h-[clamp(280px,34vw,400px)] gap-4">
      <div className="flex flex-none flex-col justify-between pb-[26px]">
        {axis.map((a, i) => (
          <span
            key={i}
            className="text-ink-450 text-[10.5px] leading-none font-medium tabular-nums"
          >
            {a}
          </span>
        ))}
      </div>
      <div className="relative flex min-w-0 flex-1 items-end gap-[clamp(6px,1.6vw,20px)]">
        <span className="pointer-events-none absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between">
          <span className="bg-line-soft block h-px" />
          <span className="bg-line-soft block h-px" />
          <span className="bg-line-soft block h-px" />
          <span className="bg-line-soft block h-px" />
          <span className="bg-line-field block h-px" />
        </span>
        {data.map((d, i) => {
          const current = i === data.length - 1;
          const h = `${Math.max((d.value / max) * 100, 2)}%`;
          return (
            <div
              key={d.label}
              className="relative flex h-full min-w-0 flex-1 flex-col items-stretch gap-2.5"
            >
              <span className="bg-surface-1 relative flex min-h-0 flex-1 items-end rounded-t-[8px]">
                <span
                  style={{
                    height: h,
                    background: current ? "var(--color-ember-600)" : color,
                  }}
                  className="block w-full rounded-t-[8px] transition-[filter] duration-[140ms] hover:brightness-110"
                />
                <span
                  style={{ bottom: h }}
                  className="pointer-events-none absolute inset-x-0 flex justify-center"
                >
                  <span
                    className={cn(
                      "border-line-base mb-[7px] rounded-full border bg-white px-2 py-[3px] text-[10.5px] font-semibold whitespace-nowrap tabular-nums shadow-[0_1px_3px_oklch(0.205_0.038_258_/_0.07)]",
                      current ? "text-ember-700" : "text-ink-700"
                    )}
                  >
                    {fmt(d.value)}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "h-4 flex-none text-center text-[11px] font-medium",
                  current ? "text-ember-700" : "text-ink-600"
                )}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Legend for the column chart — settled vs the period still in progress. */
function ChartLegend() {
  return (
    <div className="flex items-center gap-4">
      <span className="text-ink-600 inline-flex items-center gap-[7px] text-[11.5px] font-normal">
        <span className="bg-marine-500 block size-[9px] rounded-[3px]" />
        Settled
      </span>
      <span className="text-ink-600 inline-flex items-center gap-[7px] text-[11.5px] font-normal">
        <span className="bg-ember-600 block size-[9px] rounded-[3px]" />
        Current
      </span>
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
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-neutral-bg)" strokeWidth="20" />
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
          <span className="font-poppins text-ink-880 text-2xl font-medium tracking-[-0.022em] tabular-nums">
            {total}
          </span>
          <span className="text-ink-500 text-[11px]">orders</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-1">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-ink-600 text-[13px]">{d.label}</span>
            <span className="text-ink-800 ml-auto text-[13px] font-medium tabular-nums">{d.value}</span>
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
            <span className="text-[13px] font-normal">{e.name}</span>
            <span className="text-ink-800 text-[13px] font-medium tabular-nums">{e.closed} completed</span>
          </div>
          <div className="bg-neutral-bg h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-marine-500 h-full rounded-full"
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
          // Server Component render: request-time read is intentional here.
          const ageDays =
            // eslint-disable-next-line react-hooks/purity
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
    { label: "New", value: orders.filter((o) => o.status === "new").length, color: "oklch(0.505 0.170 257)" },
    { label: "In progress", value: orders.filter((o) => o.status === "in_progress").length, color: "oklch(0.470 0.105 72)" },
    { label: "Completed", value: orders.filter((o) => o.status === "completed").length, color: "oklch(0.430 0.100 158)" },
    { label: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length, color: "oklch(0.560 0.014 258)" },
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
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin/analytics?range=${r.key}`}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-medium whitespace-nowrap no-underline transition-colors hover:no-underline",
                  r.key === range.key
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
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
        <SectionCard flush>
          <EmptyState
            title="Nothing to chart yet"
            body="Once your team starts creating orders, trends, revenue and leaderboards will show up here. Completed orders drive revenue; everything else is pipeline."
          />
        </SectionCard>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <SectionCard
              title="Orders over time"
              description="Monthly order volume · this month still in progress"
              action={<ChartLegend />}
            >
              <BarChart data={ordersOverTime} />
            </SectionCard>
            <SectionCard
              title="Revenue by month"
              description="Completed revenue (GBP) · this month still in progress"
              action={<ChartLegend />}
            >
              <BarChart data={revenueByMonth} format={(v) => gbp(v)} />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard title="Orders by status">
              <Donut data={statusData} />
            </SectionCard>
            <SectionCard title="Top employees" description="By completed orders">
              {topEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-600">
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
