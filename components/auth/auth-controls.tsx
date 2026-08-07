import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The auth control layer, built to the "Auth Pages" design spec rather than on
 * the portal's shadcn primitives — these screens use their own Marine/Ink/Ember
 * tokens, a 48px control height and pill CTAs, and matching the design exactly
 * is easier without inheriting the portal button/input variants.
 */

/** Shared field styling for every text input on the auth screens. */
export const authFieldClass =
  "border-ink-300 text-ink-900 caret-marine-500 hover:border-ink-400 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-12 w-full rounded-[10px] border bg-white px-4 text-[15px] font-normal outline-none [transition:border-color_140ms_ease,box-shadow_140ms_ease] disabled:cursor-not-allowed disabled:opacity-60";

export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-ink-700 text-[13px] font-medium">
      {children}
    </label>
  );
}

/** Label + control pair with the design's 8px gap. */
export function AuthField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/** Text input, pre-styled. */
export function AuthInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(authFieldClass, className)} {...props} />;
}

/**
 * Primary pill CTA in ember. Presses down rather than lifting, and swaps to a
 * progress label while the request is in flight — the design has no spinner,
 * the label change plus the dimmed, inert surface carries the state.
 */
export function AuthSubmit({
  loading = false,
  loadingLabel,
  children,
  className,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "bg-ember-600 hover:bg-ember-700 focus:bg-ember-700 mt-2 h-12 w-full rounded-full text-[15px] font-semibold tracking-[-0.008em] text-white outline-none [transition:background-color_140ms_ease,transform_90ms_ease] focus:shadow-[0_0_0_3px_#fff,0_0_0_6px_oklch(0.565_0.172_47_/_0.42)] active:translate-y-px disabled:pointer-events-none disabled:opacity-[0.62]",
        className
      )}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

/** Outline pill — the secondary action on the terminal screens. */
export function AuthSecondaryButton({
  onClick,
  href,
  children,
  className,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "border-ink-300 text-ink-900 hover:border-ink-400 hover:bg-ink-100 focus:border-marine-500 flex h-12 w-full items-center justify-center rounded-full border bg-white text-[15px] font-semibold tracking-[-0.008em] no-underline outline-none [transition:background-color_140ms_ease,border-color_140ms_ease] focus:shadow-[0_0_0_3px_var(--color-marine-200)] hover:no-underline",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

/**
 * Inline text link. Colour and hover come from the `.auth-root a` rule in
 * globals.css (marine, underline on hover) — this only carries the weight.
 */
export const authLinkClass = "font-medium";
