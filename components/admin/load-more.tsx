"use client";

import { useTransition } from "react";
import { Btn, Spinner } from "@/components/admin/ui";

/**
 * Marks the rows that have just arrived, so they animate in while the rows
 * already on screen stay put.
 *
 * A pure function of the two numbers the list already holds — the current
 * `limit` and the `pageSize` it grows by — rather than a hook remembering the
 * previous count. Reading and writing a ref during render is a real React rule
 * violation (the value is not guaranteed to be what you think on a re-render),
 * and here it buys nothing: "the newest page" is exactly the last `pageSize`
 * rows whenever the limit has been raised at least once.
 */
export function arrivedInLastPage(
  index: number,
  limit: number,
  pageSize: number
): boolean {
  if (limit <= pageSize) return false; // first page: nothing "arrived"
  return index >= limit - pageSize;
}

/**
 * The "Load more" control for every paged list in the portal.
 *
 * Before this, each screen called `setLimit(n => n + 10)` inline: the click
 * mutated state, React re-rendered, and ten more rows simply *were* there. No
 * pending state, no arrival — which is exactly the "there is no load system"
 * complaint. Three things fix it, and all three are real rather than cosmetic:
 *
 *   1. The extra rows are committed inside a transition, so React's own
 *      `isPending` drives the spinner. On a long table that is measurable
 *      work and the spinner is genuinely visible; on a short one it is not,
 *      which is correct — nobody should be shown a fake wait.
 *   2. `onLoad` may return a promise. A screen that actually fetches the next
 *      page awaits it here, so the same button covers both cases.
 *   3. The rows that arrive animate in (`wt-row-enter`, applied by the list
 *      via the index it gets back), so the eye is told *what* changed rather
 *      than being left to diff the table itself.
 *
 * The live region is not decoration either: with the spinner too fast to see,
 * the announcement is the only feedback a screen-reader user would otherwise
 * get.
 */
export function LoadMore({
  remaining,
  pageSize,
  noun,
  onLoad,
  className,
}: {
  /** How many rows are still hidden. The control renders nothing at 0. */
  remaining: number;
  pageSize: number;
  /** Plural noun for the announcement — "orders", "customers". */
  noun: string;
  onLoad: () => void | Promise<unknown>;
  className?: string;
}) {
  const [busy, startTransition] = useTransition();

  if (remaining <= 0) return null;

  const step = Math.min(pageSize, remaining);

  return (
    <span className={className}>
      <Btn
        size="sm"
        className="h-10 text-[12.5px]"
        pending={busy}
        pendingLabel={`Loading ${step} more…`}
        onClick={() =>
          /* React 19 keeps `isPending` true across the await, so an async
             `onLoad` that really fetches drives the same spinner as a
             synchronous one that only widens the slice. */
          startTransition(async () => {
            await onLoad();
          })
        }
      >
        Load {step} more — {remaining} remaining
      </Btn>
      <span role="status" aria-live="polite" className="sr-only">
        {busy ? `Loading ${step} more ${noun}` : ""}
      </span>
    </span>
  );
}

/**
 * The inline "…fetching" line a list shows when it is refreshing content it
 * already has on screen (a realtime invalidate, a filter that hits the
 * server). Distinct from a skeleton: the old rows stay readable underneath.
 */
export function RefreshingBar({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className="text-ink-600 border-line-soft bg-surface-1 flex items-center gap-2 border-b px-5 py-2 text-[12px] font-medium"
    >
      <Spinner size={12} />
      Updating…
    </span>
  );
}
