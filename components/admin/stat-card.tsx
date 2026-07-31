import type { ReactNode } from "react";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";

/**
 * Stat card — design system v2 §06, "Flat tint, matching border, one anatomy".
 *
 * Icon chip (40px) → Plex Mono micro-label → 29px tabular metric → caption,
 * in a 20/22 box at 14px radius. Every card on every screen is that shape,
 * that padding, that radius.
 *
 * The background is a **solid tint** with a 1px border one step darker in the
 * same family. No gradient, and **no shadow** — the border does the work, and
 * these sit in the page rather than floating above it.
 *
 * The only thing that varies is the hue, and the hue is meaning, not variety:
 *
 *   ocean   volume — bookings, orders, conversations
 *   gold    money — revenue, commission, order value
 *   violet  waiting — pending, unassigned, awaiting a reply
 *   jade    confirmed — completed, live, online
 *   ruby    attention — cancelled, failed, overdue
 *   flame   featured
 */
const statCardVariants = cva("rounded-surface border px-[22px] py-5", {
  variants: {
    tone: {
      ocean: "border-sky-line bg-sky-tint",
      gold: "border-gold-line bg-gold-tint",
      jade: "border-jade-line bg-jade-tint",
      violet: "border-violet-line bg-violet-tint",
      ruby: "border-ruby-line bg-ruby-tint",
      flame: "border-flame-line bg-flame-tint",
      neutral: "border-line bg-surface",
    },
  },
  defaultVariants: {
    tone: "ocean",
  },
});

type Trend = { dir: "up" | "down"; value: string };

type StatCardProps = {
  label: string;
  /** Pre-formatted — `gbp()` for money, `String()` for counts. */
  value: ReactNode;
  icon: LucideIcon;
  /** The caption under the number. One short clause, no full stop. */
  hint?: string;
  trend?: Trend;
  className?: string;
} & VariantProps<typeof statCardVariants>;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "ocean",
  className,
}: StatCardProps) {
  return (
    <div data-slot="stat-card" className={cn(statCardVariants({ tone }), className)}>
      <IconChip tone={tone}>
        <Icon />
      </IconChip>

      <p className="mt-4 font-micro text-[10px] text-tx-faint">{label}</p>

      <p className="tabular mt-1.5 text-[29px] leading-[1.15] font-bold tracking-[-0.022em] text-tx-head">
        {value}
      </p>

      {trend ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-tx-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              /* Up isn't automatically good, but on every metric we show it is
                 — volume, revenue, completions. Ruby stays for the fall. */
              trend.dir === "up" ? "text-jade" : "text-ruby"
            )}
          >
            {trend.dir === "up" ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
            <span className="tabular">{trend.value}</span>
          </span>
          {hint ?? "vs last month"}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[13.5px] text-tx-muted">{hint}</p>
      ) : null}
    </div>
  );
}
