import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MobileField = {
  label: string;
  value: ReactNode;
  /** Span the full width of the 2-col grid (e.g. a long route). */
  wide?: boolean;
};

/**
 * Mobile (<md) stacked-card representation of a single data-table row. Used as
 * the responsive alternative to wide tables so the page never scrolls
 * sideways. Render a list of these inside a `md:hidden` wrapper and keep the
 * real <Table> inside `hidden md:block`.
 */
export function MobileRecordCard({
  title,
  subtitle,
  badge,
  action,
  fields,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  fields: MobileField[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {badge}
          {action}
        </div>
      </div>

      {fields.length > 0 ? (
        <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3.5">
          {fields.map((f) => (
            <div key={f.label} className={cn("min-w-0", f.wide && "col-span-2")}>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
