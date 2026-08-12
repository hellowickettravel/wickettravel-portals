"use client";

import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/admin/ui";

/**
 * The two inbox loading shapes, shared by the admin and employee inboxes.
 *
 * They started life inside `admin-inbox.tsx`. The employee inbox needed the
 * same two shapes, and copying them would have meant the next tweak to a row's
 * height landing in one portal and not the other — so they moved here rather
 * than being duplicated, per the one-component rule.
 *
 * Both are shaped like the REAL rows they stand in for (34px avatar, two text
 * lines, a timestamp / alternating bubbles). A generic skeleton is worse than
 * none: the layout jumps the moment real content lands.
 */

/** The left pane while the first fetch is in flight. */
export function ThreadListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 70}ms` }}
          className="after:bg-line-soft wt-fade-in relative flex gap-3 p-4 after:absolute after:right-0 after:bottom-0 after:left-[62px] after:h-px after:content-['']"
        >
          <Shimmer w={34} h={34} className="rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <Shimmer w="58%" />
            <Shimmer w="82%" h={8} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** The reading pane while a thread's history loads: alternating bubbles. */
export function ThreadSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[0, 1, 2, 3].map((i) => {
        const mine = i % 2 === 1;
        return (
          <div
            key={i}
            style={{ animationDelay: `${i * 80}ms` }}
            className={cn(
              "wt-fade-in flex w-full gap-2.5",
              mine ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Shimmer w={32} h={32} className="rounded-full" />
            <Shimmer
              w={i % 3 === 0 ? 240 : 180}
              h={48}
              className="rounded-[14px]"
            />
          </div>
        );
      })}
    </div>
  );
}
