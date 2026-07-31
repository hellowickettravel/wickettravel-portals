import { inr } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

/**
 * Lightweight pure-CSS bar chart for recent daily net earnings. No chart lib —
 * a flex row of bars keeps the bundle small and renders crisply on a phone.
 * The tallest bar is accented orange to draw the eye to the best day.
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
                    "w-full max-w-9 rounded-t-lg transition-all",
                    isPeak ? "bg-coral-deep" : "bg-ocean/85"
                  )}
                  style={{ height: `${Math.max(pct, 6)}%` }}
                  title={`${d.label}: ${inr(d.value)}`}
                >
                  <span className="sr-only">
                    {d.label}: {inr(d.value)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
