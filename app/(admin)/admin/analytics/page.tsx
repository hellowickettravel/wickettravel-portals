import { ShoppingBag, TrendingUp, CheckCircle2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import {
  ORDERS_OVER_TIME,
  REVENUE_BY_MONTH,
  ORDERS_BY_STATUS,
  TOP_EMPLOYEES,
} from "@/lib/mock/admin";
import { gbp } from "@/lib/format";

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
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max((d.value / max) * 100, 4)}%`,
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

/** SVG donut chart. */
function Donut() {
  const total = ORDERS_BY_STATUS.reduce((s, d) => s + d.value, 0);
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="20" />
          {ORDERS_BY_STATUS.map((d) => {
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
        {ORDERS_BY_STATUS.map((d) => (
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

/** Horizontal bar list. */
function TopEmployees() {
  const max = Math.max(...TOP_EMPLOYEES.map((e) => e.closed));
  return (
    <ul className="space-y-3.5">
      {TOP_EMPLOYEES.map((e) => (
        <li key={e.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{e.name}</span>
            <span className="text-muted-foreground">{e.closed} closed</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(e.closed / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const totalRevenue = REVENUE_BY_MONTH.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Performance across orders, revenue and your team."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value="152" icon={ShoppingBag} trend={{ dir: "up", value: "+11%" }} />
        <StatCard label="Revenue (6mo)" value={gbp(totalRevenue)} icon={Wallet} trend={{ dir: "up", value: "+18%" }} />
        <StatCard label="Avg order value" value={gbp(1610)} icon={TrendingUp} trend={{ dir: "up", value: "+3%" }} />
        <StatCard label="Closed rate" value="71%" icon={CheckCircle2} trend={{ dir: "down", value: "-2%" }} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Orders over time" description="Monthly order volume">
          <BarChart data={ORDERS_OVER_TIME.map((d) => ({ label: d.month, value: d.orders }))} />
        </SectionCard>
        <SectionCard title="Revenue by month" description="Gross revenue (GBP)">
          <BarChart
            data={REVENUE_BY_MONTH.map((d) => ({ label: d.month, value: d.revenue }))}
            color="var(--navy)"
            format={(v) => gbp(v)}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Orders by status">
          <Donut />
        </SectionCard>
        <SectionCard title="Top employees" description="By closed orders">
          <TopEmployees />
        </SectionCard>
      </div>
    </div>
  );
}
