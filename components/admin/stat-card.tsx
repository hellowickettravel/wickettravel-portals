import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Trend = { dir: "up" | "down"; value: string };

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: Trend;
  hint?: string;
};

/**
 * KPI card. Skin lives in `globals.css` (`.wt-card`, `.wt-stat-*`): the
 * portals keep the navy/orange treatment, and inside `.admin-root` it becomes
 * the design's card — tinted icon chip, 11px/0.11em uppercase label, and the
 * figure in Poppins 500 at 24px tabular.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
}: StatCardProps) {
  return (
    <div className="wt-card">
      <div className="wt-card-body flex flex-col gap-3">
        <span className="wt-stat-chip flex size-9 items-center justify-center">
          <Icon className="size-[18px]" />
        </span>
        <span className="wt-stat-label">{label}</span>
        <span className="flex flex-wrap items-baseline gap-2.5">
          <span className="wt-stat-value">{value}</span>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-[3px] rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                trend.dir === "up"
                  ? "bg-ok-bg text-ok-ink"
                  : "bg-danger-bg text-danger-ink"
              )}
            >
              {trend.dir === "up" ? "↑" : "↓"} {trend.value}
            </span>
          ) : null}
        </span>
        {hint ? <span className="wt-stat-hint text-pretty">{hint}</span> : null}
      </div>
    </div>
  );
}
