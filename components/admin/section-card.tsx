import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove the default padding on the body (useful for full-bleed tables). */
  flush?: boolean;
};

/**
 * Titled card used across every portal. The skin is `.wt-card` in
 * `globals.css`: navy/orange by default, and the Admin Portal design's
 * 12px-radius, e1-elevation card with a ruled header inside `.admin-root`.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush,
}: SectionCardProps) {
  return (
    <div className={cn("wt-card", className)}>
      {title || action ? (
        <div className="wt-card-head">
          <div className="flex min-w-0 flex-col gap-[3px]">
            {title ? <h2 className="wt-card-title m-0">{title}</h2> : null}
            {description ? (
              <p className="wt-card-desc m-0 text-pretty">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="wt-card-body" data-flush={flush ? "true" : undefined}>
        {children}
      </div>
    </div>
  );
}
