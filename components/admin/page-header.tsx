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
 * Page header — design system v3 §12, the portal's version.
 *
 * Eyebrow → H1 → lede → action. Left-aligned always; centring belongs inside
 * an ocean statement band, nowhere else.
 *
 * The H1 is the screen's one Fraunces moment (via the base `h1` rule) and
 * steps down below 640px so a long title doesn't wrap into three lines on a
 * phone. A hairline underneath separates the header from the content without
 * needing a card around it — that rule is what stops every admin screen from
 * opening with a floating box.
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
        "flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3.5 font-micro text-flame">{eyebrow}</p>
        ) : null}
        <h1 className="text-[27px] leading-[1.18] font-semibold text-balance text-tx-head sm:text-[36px] sm:leading-[1.1]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3.5 max-w-[58ch] text-[16px] leading-[1.65] text-tx-muted">
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
