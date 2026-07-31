import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Reusable loading skeletons for the portals. Built on the base <Skeleton>.
 * Not yet wired to real loading — data is still mock. Drop these into Suspense
 * fallbacks / TanStack `isLoading` branches in Batch 3.
 */

/** A single stat card placeholder, matching <StatCard>. */
export function StatCardSkeleton() {
  return (
    <Card className="shadow-lift">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="size-9 rounded-xl" />
        </div>
        <Skeleton className="mt-3 h-7 w-16" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
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

/** A table placeholder: header row + N body rows × M columns, inside a card. */
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
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-lift",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Conversation list rows (used in the inbox left pane / dashboard lists). */
export function ConversationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
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
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
      {/* Left list */}
      <aside className="hidden w-[330px] shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border p-3">
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationListSkeleton rows={7} />
        </div>
      </aside>

      {/* Right thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-3 bg-sunk/50 px-4 py-5 md:px-6">
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
              <Skeleton className={cn("h-10 rounded-2xl", b.w)} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="size-11 shrink-0 rounded-full" />
        </div>
      </section>
    </div>
  );
}
