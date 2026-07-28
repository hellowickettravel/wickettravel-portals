"use client";

import { Wallet, CalendarDays, CalendarRange, TrendingUp, Banknote } from "lucide-react";
import { StatTile } from "@/components/driver/stat-tile";
import { EarningsChart } from "@/components/driver/earnings-chart";
import {
  EARNINGS,
  EARNINGS_SUMMARY,
  EARNINGS_TREND,
  netOf,
  inr,
} from "@/lib/driver/mock";

export default function EarningsPage() {
  const weekNet = EARNINGS_TREND.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-navy sm:text-2xl">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your payouts after Wicket commission
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Today" value={inr(EARNINGS_SUMMARY.today)} icon={Wallet} accent />
        <StatTile label="This week" value={inr(EARNINGS_SUMMARY.week)} icon={CalendarDays} />
        <StatTile label="This month" value={inr(EARNINGS_SUMMARY.month)} icon={CalendarRange} />
        <StatTile label="All time" value={inr(EARNINGS_SUMMARY.total)} icon={Banknote} />
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-navy">Last 7 days</h2>
            <p className="text-xs text-muted-foreground">Net earnings per day</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <TrendingUp className="size-3.5" />
            {inr(weekNet)}
          </span>
        </div>
        <EarningsChart data={EARNINGS_TREND} />
      </div>

      {/* Per-ride breakdown */}
      <div className="rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10 shadow-card">
        <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
          <h2 className="font-display text-sm font-semibold text-navy">Recent payouts</h2>
          <span className="text-xs text-muted-foreground">Fare − fee = net</span>
        </div>
        <ul className="divide-y divide-border">
          {EARNINGS.map((e) => (
            <li key={e.ref} className="flex items-center gap-3 px-3.5 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                <Wallet className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy">{e.route}</p>
                <p className="text-xs text-muted-foreground">
                  {e.ref} · {e.dateLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-semibold text-emerald-700">
                  {inr(netOf(e))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {inr(e.fare)} − {inr(e.commission)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Payouts are settled weekly every Monday to your registered bank account.
      </p>
    </div>
  );
}
