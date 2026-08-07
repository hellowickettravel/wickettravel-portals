import Link from "next/link";
import { getOrders } from "@/lib/db/orders";
import { gbp, routeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiGrid,
  Meter,
  PageHead,
  Screen,
} from "@/components/admin/ui";

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "12m", label: "12 months", days: 365 },
] as const;

const BAR_SETTLED =
  "linear-gradient(180deg, oklch(0.585 0.165 257) 0%, oklch(0.505 0.170 257) 100%)";
const BAR_CURRENT =
  "linear-gradient(180deg, oklch(0.640 0.185 47) 0%, oklch(0.565 0.172 47) 100%)";

/**
 * The design's column chart: a five-line grid behind the plot, a value chip
 * floating above each column, and the current (right-most, still-in-progress)
 * period picked out in ember while every settled period stays marine.
 */
/** Next readable round number at or above `v`, with at least 10% headroom. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const target = v * 1.1;
  const exp = Math.pow(10, Math.floor(Math.log10(target)));
  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const f = target / exp;
  return (steps.find((s) => s >= f) ?? 10) * exp;
}

function ColumnChart({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format: (v: number) => string;
}) {
  // The design's axis tops out above its tallest bar (£5k for a £4.3k peak),
  // which is what leaves room for the value pill that sits on top of it. A bar
  // scaled to the raw maximum touches the ceiling and pushes its pill out of
  // the plot, so round the ceiling up to the next readable step instead.
  const max = niceCeil(Math.max(1, ...data.map((d) => d.value)));
  const axis = [1, 0.75, 0.5, 0.25, 0].map((f) => format(Math.round(max * f)));

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
          const h = `${Math.round((d.value / max) * 100)}%`;
          return (
            <div
              key={d.label}
              className="relative flex h-full min-w-0 flex-1 flex-col items-stretch gap-2.5"
            >
              <span className="bg-surface-1 relative flex min-h-0 flex-1 items-end rounded-t-[8px]">
                <span
                  style={{ height: h, background: current ? BAR_CURRENT : BAR_SETTLED }}
                  className="block w-full rounded-t-[8px] transition-[filter] duration-[140ms] hover:brightness-[1.08]"
                />
                <span
                  style={{ bottom: h }}
                  className="pointer-events-none absolute inset-x-0 flex justify-center"
                >
                  <span
                    className={cn(
                      "border-line-base mb-[7px] rounded-full border bg-white px-2 py-[3px] text-[10.5px] font-semibold whitespace-nowrap tabular-nums shadow-[0_1px_3px_oklch(0.205_0.038_258_/_0.07)]",
                      current ? "text-ember-700" : "text-ink-600"
                    )}
                  >
                    {format(d.value)}
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

/** Settled vs the period still in progress. */
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

function lastEightMonths() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
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

function kShort(v: number) {
  if (v >= 1000) return `£${(v / 1000).toFixed(1)}k`;
  return `£${Math.round(v)}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1]; // default 30 days

  const allOrders = await getOrders();
  // Server Component render: a request-time read is intentional here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const cutoff = now - range.days * 86_400_000;
  const prevCutoff = cutoff - range.days * 86_400_000;

  const inRange = allOrders.filter(
    (o) => new Date(o.created_at).getTime() >= cutoff
  );
  const previous = allOrders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= prevCutoff && t < cutoff;
  });

  const completed = inRange.filter((o) => o.status === "completed");
  const prevCompleted = previous.filter((o) => o.status === "completed");

  const revenue = completed.reduce((s, o) => s + (o.selling_price ?? 0), 0);
  const commission = completed.reduce((s, o) => s + (o.commission ?? 0), 0);
  const prevCommission = prevCompleted.reduce(
    (s, o) => s + (o.commission ?? 0),
    0
  );
  const avgOrder = completed.length ? Math.round(revenue / completed.length) : 0;
  const prevAvg = prevCompleted.length
    ? Math.round(
        prevCompleted.reduce((s, o) => s + (o.selling_price ?? 0), 0) /
          prevCompleted.length
      )
    : 0;
  const conversion = inRange.length
    ? Math.round((completed.length / inRange.length) * 100)
    : 0;

  const ordersDelta = inRange.length - previous.length;
  const ordersPct = previous.length
    ? Math.round((ordersDelta / previous.length) * 100)
    : null;
  const avgDelta = avgOrder - prevAvg;
  const commissionDelta = commission - prevCommission;

  // The chart is always the last eight months of settled commission, whatever
  // the KPI range is — the design's own rule.
  const months = lastEightMonths();
  const chart = months.map((m) => ({
    label: m.label,
    value: allOrders
      .filter(
        (o) =>
          o.status === "completed" &&
          monthKey(o.closed_at ?? o.created_at) === m.key
      )
      .reduce((s, o) => s + (o.commission ?? 0), 0),
  }));

  // Top routes by order count.
  const routeCounts = new Map<string, number>();
  for (const o of inRange) {
    if (!o.route_from || !o.route_to) continue;
    const k = routeLabel(o.route_from, o.route_to);
    routeCounts.set(k, (routeCounts.get(k) ?? 0) + 1);
  }
  const topRoutes = [...routeCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxRoute = Math.max(1, ...topRoutes.map((r) => r.count));

  // Commission by employee, over the same window.
  const byEmployee = new Map<string, number>();
  for (const o of completed) {
    const name =
      o.assigned_employee?.full_name ??
      o.created_by_profile?.full_name ??
      "Unassigned";
    byEmployee.set(name, (byEmployee.get(name) ?? 0) + (o.commission ?? 0));
  }
  const topEmployees = [...byEmployee.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const maxEmployee = Math.max(1, ...topEmployees.map((e) => e.value));

  const hasData = allOrders.length > 0;

  return (
    <Screen>
      <PageHead
        title="Analytics"
        intro="Where the business is coming from and who is closing it."
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
                    : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <KpiGrid>
        <Kpi
          label="Orders"
          value={inRange.length}
          meta={
            ordersPct === null
              ? "No orders in the previous period"
              : `${ordersPct >= 0 ? "+" : ""}${ordersPct}% on previous period`
          }
          metaClass={
            ordersPct === null
              ? undefined
              : ordersPct >= 0
                ? "text-ok-ink"
                : "text-danger-ink"
          }
        />
        <Kpi
          label="Conversion"
          value={`${conversion}%`}
          meta="Orders in this window that completed"
        />
        <Kpi
          label="Average order"
          value={gbp(avgOrder)}
          meta={`${avgDelta >= 0 ? "+" : "−"}${gbp(Math.abs(avgDelta))} on previous period`}
          metaClass={avgDelta >= 0 ? "text-ok-ink" : "text-danger-ink"}
        />
        <Kpi
          label="Commission"
          value={gbp(commission)}
          valueClass="text-ok-ink"
          meta={`${commissionDelta >= 0 ? "+" : "−"}${gbp(Math.abs(commissionDelta))} on previous period`}
          metaClass={commissionDelta >= 0 ? "text-ok-ink" : "text-danger-ink"}
        />
      </KpiGrid>

      {!hasData ? (
        <Card>
          <EmptyState
            title="Nothing to chart yet"
            body="Once your team starts completing orders, commission trends, top routes and the team leaderboard all show up here. Completed orders drive every figure on this page."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHead
              title="Commission by month"
              hint="Last eight months · this month still in progress"
              action={<ChartLegend />}
            />
            <div className="p-[clamp(20px,2.4vw,28px)]">
              <ColumnChart data={chart} format={kShort} />
            </div>
          </Card>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-4">
            <Card className="flex h-full flex-col">
              <CardHead title="Top routes" />
              <div className="flex-1 px-5 pt-3 pb-5">
                {topRoutes.length === 0 ? (
                  <p className="text-ink-600 m-0 py-8 text-center text-[13px]">
                    No routes recorded in this period.
                  </p>
                ) : (
                  topRoutes.map((r) => (
                    <Meter
                      key={r.label}
                      label={r.label}
                      value={`${r.count} ${r.count === 1 ? "order" : "orders"}`}
                      pct={(r.count / maxRoute) * 100}
                    />
                  ))
                )}
              </div>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHead title="Commission by employee" />
              <div className="flex-1 px-5 pt-3 pb-5">
                {topEmployees.length === 0 ? (
                  <p className="text-ink-600 m-0 py-8 text-center text-[13px]">
                    No commission earned in this period.
                  </p>
                ) : (
                  topEmployees.map((e) => (
                    <Meter
                      key={e.label}
                      label={e.label}
                      value={gbp(e.value)}
                      pct={(e.value / maxEmployee) * 100}
                      fill="var(--color-ember-600)"
                    />
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </Screen>
  );
}
