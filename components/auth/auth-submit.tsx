import type { ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The auth submit — design system v5 §16.
 *
 * A full pill, 56px, solid coral, with a coral-tinted bloom under it.
 * The only pill and the only glow in the product, and both are load-
 * bearing: this is the single ask on an otherwise empty page, and the
 * page has no card, no shadow and no other saturated colour on it. In a
 * dense portal screen the same treatment would be noise; here it is the
 * one thing the eye is meant to land on.
 *
 * `coral` and not `coral-vivid`: white on the vivid orange is 3.79:1 and
 * fails AA under a button label. The fill has to be the accessible one.
 *
 * The arrow is the only motion on the screen — 3px on hover, and it
 * stops entirely under `prefers-reduced-motion` (handled globally).
 */
export function AuthSubmit({
  loading = false,
  loadingLabel,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className={cn(
        "group/submit inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-coral text-[15.5px] font-bold tracking-[-0.01em] text-tx-invert shadow-action transition-[background-color,box-shadow] duration-150 ease-brand outline-none select-none hover:bg-coral-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral active:bg-coral-press disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-[18px] animate-spin" />
          {loadingLabel ?? "Working…"}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="size-[18px] transition-transform duration-200 ease-brand group-hover/submit:translate-x-[3px]" />
        </>
      )}
    </button>
  );
}

/**
 * The quiet alternative under the pill — "Continue with Google", "Back to
 * sign in". Same 56px height and pill shape so the stack reads as one
 * group, but hollow, so it never competes with the ask above it.
 *
 * Exported as a class as well as a component because some call sites need
 * it on a <Link> rather than a <button>.
 */
export const authSecondaryClassName =
  "inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-line-strong bg-transparent text-[15px] font-semibold text-tx-head transition-colors duration-150 ease-brand outline-none select-none hover:border-line-hover hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-55";

export function AuthSecondary({
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(authSecondaryClassName, className)}
      {...props}
    >
      {children}
    </button>
  );
}
