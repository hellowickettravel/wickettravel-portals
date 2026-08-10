"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Immediate feedback that a click landed.
 *
 * A server-rendered route can take a few hundred milliseconds to arrive, and
 * in that gap nothing moves — which reads as a dead button, not as loading.
 * `useLinkStatus` reports the pending state of the enclosing <Link>, so the
 * item the user actually clicked is the thing that responds. That is far
 * better than a global bar: it answers "did my click register?" rather than
 * "is the app busy?".
 *
 * Both variants below must be rendered INSIDE a <Link>.
 */

/** A small spinner that replaces a nav item's live count while it loads. */
export function LinkSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "block size-3 flex-none animate-spin rounded-full border-[1.6px] border-white/30 border-t-white/90",
        className
      )}
    />
  );
}

/**
 * A pending row's own subtle wash. Used on sidebar items and tab bar entries
 * so the whole target acknowledges the press, not just a corner of it.
 */
export function LinkPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      data-pending={pending ? "" : undefined}
      className={cn(
        "contents motion-safe:transition-opacity",
        pending && "opacity-70",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * The thin bar that grows across the top of the viewport while a navigation is
 * in flight. Deliberately never reaches 100% on its own — it completes by
 * unmounting when the route arrives, so it can't lie about being finished.
 */
export function LinkTopBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="bg-ember-500 fixed inset-x-0 top-0 z-[60] h-[3px] origin-left motion-safe:animate-[wt-route_1.4s_cubic-bezier(0.16,1,0.3,1)_forwards] motion-reduce:opacity-70"
    />
  );
}
