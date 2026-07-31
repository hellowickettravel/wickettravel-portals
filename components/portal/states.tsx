import type { ReactNode } from "react";
import { Inbox, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";

/**
 * Empty state — the calm one.
 *
 * A neutral icon chip, an H4, one line saying what would put something here,
 * and at most one action. No illustration, no apology, no exclamation mark.
 * Centred, because this is the only place in the portal with nothing to
 * left-align against.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  /** A 20px Lucide icon. Defaults to an inbox. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <IconChip tone="neutral">{icon ?? <Inbox />}</IconChip>
      <p className="mt-4 text-[16.5px] leading-[1.42] font-semibold text-tx-head">
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-[46ch] text-[14.5px] leading-[1.6] text-tx-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Error state — rose, because rose means attention, and a sentence that says
 * what to do next rather than what went wrong internally.
 */
function ErrorState({
  title = "Couldn't load this",
  description = "Something went wrong on our side. Refresh to try again.",
  action,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <IconChip tone="rose">
        <TriangleAlert />
      </IconChip>
      <p className="mt-4 text-[16.5px] leading-[1.42] font-semibold text-tx-head">
        {title}
      </p>
      <p className="mt-2 max-w-[46ch] text-[14.5px] leading-[1.6] text-tx-muted">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export { EmptyState, ErrorState };
