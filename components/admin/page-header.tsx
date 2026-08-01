import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /**
   * Uppercase micro-label in coral. It should carry a FACT — a count, a
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
 * Page header — design system v4 §15.
 *
 * Eyebrow → H1 → lede → action. Left-aligned always; centring belongs on an
 * auth panel and nowhere else.
 *
 * This carries the screen's ONLY <h1>. The topbar deliberately does not
 * repeat the page name, so this is the single place a screen announces
 * itself. Inter at 24px (22px on a phone) — the serif never appears here.
 *
 * A hairline underneath separates the header from the content without
 * needing a card around it, which is what stops every admin screen from
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
        "flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 font-micro text-coral-ink">{eyebrow}</p>
        ) : null}
        <h1 className="text-[22px] leading-[1.2] font-semibold text-balance text-tx-head sm:text-[24px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-tx-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
