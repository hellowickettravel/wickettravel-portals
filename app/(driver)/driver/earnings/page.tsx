"use client";

import { EarningsChart } from "@/components/driver/earnings-chart";
import {
  Card,
  CardHead,
  Kpi,
  KpiGrid,
  PageHead,
  Screen,
} from "@/components/admin/ui";
import { PoundIcon, RouteIcon, WalletIcon } from "@/components/admin/icons";
import {
  EARNINGS,
  EARNINGS_SUMMARY,
  EARNINGS_TREND,
  inr,
  netOf,
} from "@/lib/driver/mock";

/**
 * Driver earnings. Money follows the system's rule everywhere on this screen:
 * ink, tabular, never coloured — except the net figure, which is the driver's
 * take-home and so gets the one success tint the system allows a commission.
 */
export default function EarningsPage() {
  const weekNet = EARNINGS_TREND.reduce((sum, day) => sum + day.value, 0);

  return (
    <Screen width={1080}>
      <PageHead
        title="Earnings"
        intro="Your payouts after the Wicket commission. Settled weekly, every Monday, to your registered bank account."
      />

      <KpiGrid>
        <Kpi
          label="Today"
          value={inr(EARNINGS_SUMMARY.today)}
          meta="Net of the Wicket fee"
          tone="ok"
          icon={<WalletIcon size={18} />}
        />
        <Kpi
          label="This week"
          value={inr(EARNINGS_SUMMARY.week)}
          meta="Monday to today"
          tone="marine"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="This month"
          value={inr(EARNINGS_SUMMARY.month)}
          meta="Calendar month to date"
          tone="marine"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="All time"
          value={inr(EARNINGS_SUMMARY.total)}
          meta="Since you joined"
          tone="violet"
          icon={<RouteIcon size={18} />}
        />
      </KpiGrid>

      {/* ------------------------------------------------------- the trend */}
      <Card>
        <CardHead
          title="Last 7 days"
          hint="Net earnings per day"
          action={
            <span className="bg-ok-bg text-ok-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap tabular-nums">
              {inr(weekNet)} this week
            </span>
          }
        />
        <div className="px-5 py-5">
          <EarningsChart data={EARNINGS_TREND} />
        </div>
      </Card>

      {/* ---------------------------------------------------- the payouts */}
      <Card>
        <CardHead title="Recent payouts" hint="Fare − Wicket fee = your net" />
        <ul className="m-0 flex list-none flex-col p-0">
          {EARNINGS.map((entry) => (
            <li
              key={entry.ref}
              className="border-line-soft flex items-center gap-3.5 border-b px-5 py-3.5 last:border-b-0"
            >
              <span className="bg-marine-tint text-marine-600 flex size-9 flex-none items-center justify-center rounded-full">
                <WalletIcon size={17} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-ink-850 truncate text-[13.5px] font-medium">
                  {entry.route}
                </span>
                <span className="text-ink-500 truncate text-[11.5px] font-normal tabular-nums">
                  {entry.ref} · {entry.dateLabel}
                </span>
              </div>
              <div className="flex flex-none flex-col items-end">
                <span className="text-ok-ink text-[13.5px] font-semibold tabular-nums">
                  {inr(netOf(entry))}
                </span>
                <span className="text-ink-500 text-[11.5px] font-normal tabular-nums">
                  {inr(entry.fare)} − {inr(entry.commission)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  );
}
