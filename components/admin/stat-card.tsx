import type { ReactNode } from "react";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";

/**
 * Stat card — design-system.html §11, "Stat cards — one anatomy".
 *
 * Icon chip (42px) → Plex Mono micro-label → 30px tabular metric → caption.
 * Every card on every screen is that shape, that padding, that radius. The
 * only thing that varies is the hue, and the hue is not a decoration:
 *
 *   ocean   volume — bookings, orders, conversations
 *   amber   money — revenue, commission, order value
 *   indigo  waiting — pending, unassigned, awaiting a reply
 *   mint    confirmed — completed, live, online
 *   rose    attention — cancelled, failed, overdue
 *   coral   featured
 *
 * The wash is the specimen's own formula — the hue's tint fading to white at
 * 62% on a 155° axis, bordered in the hue's line token — so a tone the
 * specimen doesn't happen to draw (rose, coral) still lands on system values
 * rather than on a new one.
 */
const statCardVariants = cva("rounded-surface border px-6 py-[22px] shadow-lift", {
  variants: {
    tone: {
      ocean:
        "border-sky-line bg-[linear-gradient(155deg,var(--sky-tint),var(--surface)_62%)]",
      amber:
        "border-amber-line bg-[linear-gradient(155deg,var(--amber-tint),var(--surface)_62%)]",
      mint: "border-mint-line bg-[linear-gradient(155deg,var(--mint-tint),var(--surface)_62%)]",
      indigo:
        "border-indigo-line bg-[linear-gradient(155deg,var(--indigo-tint),var(--surface)_62%)]",
      rose: "border-rose-line bg-[linear-gradient(155deg,var(--rose-tint),var(--surface)_62%)]",
      coral:
        "border-coral-line bg-[linear-gradient(155deg,var(--coral-tint),var(--surface)_62%)]",
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

      <p className="mt-[18px] font-micro text-tx-faint">{label}</p>

      <p className="tabular mt-[7px] text-[30px] leading-[1.14] font-bold tracking-[-0.022em] text-tx-head">
        {value}
      </p>

      {trend ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-tx-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              /* Up isn't automatically good, but on every metric we show it is
                 — volume, revenue, completions. Rose stays for the fall. */
              trend.dir === "up" ? "text-mint" : "text-rose"
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
