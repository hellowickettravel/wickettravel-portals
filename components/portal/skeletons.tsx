import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/**
 * Loading skeletons for the portals, built on the base <Skeleton>.
 *
 * A skeleton stands in for a specific shape, not for "content" in general —
 * it should occupy the same surface, radius and rhythm the real thing will,
 * so nothing jumps when the data lands.
 */

/** A single stat card placeholder, matching <StatCard>'s anatomy exactly:
 *  32px chip → 16px micro-label → 30px metric → 19px caption, in the same
 *  18/16 box with the same border and shadow. The heights here are the
 *  RENDERED heights, not the font sizes — that is the only way the card
 *  does not resize at the moment the real number arrives. */
export function StatCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface px-[18px] py-4 shadow-card">
      <Skeleton className="size-8 rounded-icon" />
      <Skeleton className="mt-4 h-4 w-24" />
      <Skeleton className="mt-1.5 h-[30px] w-20" />
      <Skeleton className="mt-1.5 h-[19px] w-28" />
    </div>
  );
}

/** A responsive grid of stat-card skeletons. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A table placeholder: header row + N body rows × M columns, on a panel. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <Panel className={cn("overflow-hidden", className)}>
      {/* Header — the real one sits on `sunk`, so this does too. */}
      <div className="flex h-9 items-center gap-4 border-b border-line bg-sunk px-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-line" />
        ))}
      </div>
      {/* Rows — 14px of vertical air, hairline dividers. */}
      <div className="divide-y divide-line-faint">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-3 py-2.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}
              />
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Conversation list rows (used in the inbox left pane / dashboard lists). */
export function ConversationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line-faint">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          {/* Avatars are the one circle in the system. */}
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Full inbox skeleton: conversation list + a message thread pane. */
export function InboxSkeleton() {
  return (
    <Panel className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] overflow-hidden">
      {/* Left list */}
      <aside className="hidden w-[330px] shrink-0 flex-col border-r border-line md:flex">
        <div className="border-b border-line p-3">
          <Skeleton className="h-[38px] w-full" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationListSkeleton rows={7} />
        </div>
      </aside>

      {/* Right thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-3 bg-canvas px-4 py-5 md:px-6">
          {[
            { mine: false, w: "w-56" },
            { mine: true, w: "w-40" },
            { mine: false, w: "w-44" },
            { mine: true, w: "w-52" },
          ].map((b, i) => (
            <div
              key={i}
              className={cn("flex", b.mine ? "justify-end" : "justify-start")}
            >
              <Skeleton className={cn("h-10 rounded-card", b.w)} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-surface px-3 py-3">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="size-[46px] shrink-0" />
        </div>
      </section>
    </Panel>
  );
}
