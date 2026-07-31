import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /**
   * Plex Mono micro-label in flame. It should carry a FACT — a count, a
   * date, a route — not a category. "12 open" beats "Orders".
   */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One or two sentences. Capped at 58 characters of measure. */
  subtitle?: ReactNode;
  /** Sits on the right on desktop; wraps under the lede on mobile. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Page header — design-system.html §12, the portal's version.
 *
 * Eyebrow → H1 → lede → action, at the locked 12 / 14 rhythm. Left-aligned
 * always; centring belongs inside an ocean statement band, nowhere else.
 *
 * The H1 steps down to the H2 size below 640px so a long title doesn't wrap
 * into three lines on a phone — both values are on the scale.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3 font-micro text-flame">{eyebrow}</p>
        ) : null}
        <h1 className="text-[25px] leading-[1.26] font-bold tracking-heading text-tx-head text-balance sm:text-[32px] sm:leading-[1.16]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3.5 max-w-[58ch] text-[16.5px] leading-[1.7] text-tx-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
