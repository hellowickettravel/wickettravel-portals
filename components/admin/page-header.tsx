import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

/**
 * Shared page header. The visual treatment lives in `globals.css` as
 * `.wt-eyebrow` / `.wt-page-title` / `.wt-page-sub`, which carry the portals'
 * navy/orange look by default and the Admin Portal design's type scale inside
 * `.admin-root` — so one component serves both without either leaking.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="wt-eyebrow m-0 mb-1.5">{eyebrow}</p> : null}
        <h1 className="wt-page-title m-0">{title}</h1>
        {subtitle ? (
          <p className="wt-page-sub mt-1.5 max-w-[68ch] text-pretty">
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
