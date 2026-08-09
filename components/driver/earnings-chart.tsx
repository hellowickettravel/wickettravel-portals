import { inr } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

/**
 * Lightweight pure-CSS bar chart for recent daily net earnings. No chart lib —
 * a flex row of bars keeps the bundle small and renders crisply on a phone.
 *
 * The best day is the one bar allowed Ember; every other day is marine. That
 * follows the system's rule that Ember marks the one thing worth looking at,
 * and here the graphical fill is exactly the permitted use of it.
 */
export function EarningsChart({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-40 items-end justify-between gap-2">
        {data.map((d) => {
          const pct = Math.round((d.value / max) * 100);
          const isPeak = d.value === peak;
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-full w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-9 rounded-t-[6px] transition-[height] duration-300",
                    isPeak ? "bg-ember-500" : "bg-marine-edge"
                  )}
                  style={{ height: `${Math.max(pct, 6)}%` }}
                  title={`${d.label}: ${inr(d.value)}`}
                >
                  <span className="sr-only">
                    {d.label}: {inr(d.value)}
                  </span>
                </div>
              </div>
              <span className="text-ink-500 text-[11px] font-medium">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
