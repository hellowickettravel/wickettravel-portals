import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact stat tile tuned for phones — icon chip on top, big value, label
 * underneath. Sits two-up on a narrow screen without crowding.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  accent,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  /** Highlight the value in orange (e.g. earnings). */
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-4 ring-1 ring-foreground/10 shadow-card",
        className
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-chip text-brand-dark">
        <Icon className="size-[18px]" />
      </div>
      <p
        className={cn(
          "mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl",
          accent ? "text-orange-dark" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}
