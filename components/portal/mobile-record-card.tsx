import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MobileField = {
  label: string;
  value: ReactNode;
  /** Span the full width of the 2-col grid (e.g. a long route). */
  wide?: boolean;
  /** Tabular numerals — fares, counts, references. */
  numeric?: boolean;
};

/**
 * Mobile (<md) stacked-card representation of a single data-table row.
 *
 * A table on a phone is either a sideways scroll or a squeeze; this is
 * neither. Same surface and density as <Card size="sm">, with the column
 * names demoted to Plex Mono micro-labels so the values carry the row.
 *
 * Render a list of these inside a `md:hidden` wrapper and keep the real
 * <Table> inside `hidden md:block` — or let <DataTable> do both for you.
 */
export function MobileRecordCard({
  title,
  subtitle,
  badge,
  action,
  fields,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  fields: MobileField[];
  className?: string;
}) {
  return (
    <div
      data-slot="mobile-record-card"
      className={cn(
        "rounded-card border border-line bg-surface p-[18px] shadow-card transition-colors duration-150 ease-brand",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-[1.4] font-semibold text-tx-head">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-[13px] text-tx-muted">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {action}
        </div>
      </div>

      {fields.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-faint pt-4">
          {fields.map((f) => (
            <div key={f.label} className={cn("min-w-0", f.wide && "col-span-2")}>
              <dt className="font-micro text-tx-muted">{f.label}</dt>
              <dd
                className={cn(
                  "mt-1 truncate text-[14.5px] text-tx-body",
                  f.numeric && "tabular"
                )}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
