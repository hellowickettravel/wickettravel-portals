import type { CSSProperties, ReactNode } from "react";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";

/**
 * Stat card — design system v4 §15, "White card, coloured icon chip".
 *
 * A white surface with a hairline border and a whisper of shadow. The only
 * colour is the 32px icon chip and the trend arrow — the number itself is
 * ink. That is the whole point: four tinted blocks in a row compete with
 * each other and with the page, while four white cards let the four numbers
 * be the loudest thing on the screen.
 *
 * Anatomy, fixed: chip → micro-label → 26px tabular metric → caption. Every
 * card on every screen is that shape, that padding, that radius, so a row of
 * them reads as one object rather than as four separate ones.
 *
 * The hue is meaning, never variety:
 *
 *   marine  volume — bookings, orders, conversations
 *   gold    money — revenue, commission, order value
 *   violet  waiting — pending, unassigned, awaiting a reply
 *   jade    confirmed — completed, live, online
 *   ruby    attention — cancelled, failed, overdue
 *   coral   featured
 */

type Trend = { dir: "up" | "down"; value: string };

type StatTone = "marine" | "gold" | "jade" | "violet" | "ruby" | "coral" | "neutral";

type StatCardProps = {
  label: string;
  /** Pre-formatted — `gbp()` for money, `String()` for counts. */
  value: ReactNode;
  icon: LucideIcon;
  /** The caption under the number. One short clause, no full stop. */
  hint?: string;
  trend?: Trend;
  tone?: StatTone;
  className?: string;
  /** Position in the row, for the staggered entrance (v4 §13). */
  index?: number;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "marine",
  className,
  index = 0,
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "rise-stagger rounded-card border border-line bg-surface px-[18px] py-4 shadow-card",
        className
      )}
    >
      <IconChip tone={tone}>
        <Icon />
      </IconChip>

      {/* `tx-muted`, never `tx-faint` — this label has to be readable at
          11px, and faint does not clear AA at any size. */}
      <p className="mt-4 font-micro text-tx-muted">{label}</p>

      <p className="tabular mt-1.5 text-[26px] leading-[1.15] font-semibold tracking-[-0.021em] text-tx-head">
        {value}
      </p>

      {trend ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-tx-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              /* Up is not automatically good, but on every metric we show it
                 is — volume, revenue, completions. Ruby stays for the fall. */
              trend.dir === "up" ? "text-jade-ink" : "text-ruby-ink"
            )}
          >
            {trend.dir === "up" ? (
              <TrendingUp className="size-[14px]" />
            ) : (
              <TrendingDown className="size-[14px]" />
            )}
            <span className="tabular">{trend.value}</span>
          </span>
          {hint ?? "vs last month"}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-tx-muted">{hint}</p>
      ) : null}
    </div>
  );
}
