import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Monogram } from "@/components/brand/monogram";
import { AuthFooter } from "@/components/auth/auth-footer";

/**
 * The brand panel — design system v5 §16.
 *
 * Flat marine. No artwork, no gradient, no proof list, no icon chips.
 *
 * The restraint is the design. An auth panel has one job — say whose
 * product this is with enough confidence that the form beside it feels
 * trustworthy — and every extra object on it works against that. The
 * earlier version put a three-item feature list and a line drawing on
 * here, and the result read as a marketing slide rather than as a front
 * door.
 *
 * So: four things, pinned to the panel's three anchor points. A micro
 * label top-left, the brand lockup and its statement holding the middle,
 * the domain bottom-left. Nothing floats in between.
 *
 * Below `lg` it is not rendered at all — the form column grows its own
 * compact lockup rather than squashing a two-up layout onto a phone.
 */
function AuthStatement({
  eyebrow,
  headline,
}: {
  eyebrow: string;
  headline: ReactNode;
}) {
  return (
    <section className="relative hidden bg-rail lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-16">
      <p className="font-micro text-tx-rail-dim">{eyebrow}</p>

      {/* The middle band. `justify-between` on the parent pins the label and
          the domain to the edges; this block takes the space left over and
          centres itself in it, which is what keeps the lockup optically
          central regardless of viewport height. */}
      <div className="flex flex-col justify-center py-10">
        <div className="flex items-center gap-4">
          <Monogram tone="light" className="size-14 rounded-[14px] text-[19px]" />
          <span className="text-[34px] leading-none font-extrabold tracking-[-0.028em] text-tx-invert">
            Wicket Travel
          </span>
        </div>

        {/* The statement carries its measure on the type itself, not on a
            wrapper — `ch` resolves against the element's own font-size, so
            a cap set on a 14px container would strangle a 26px line. */}
        <p className="mt-9 max-w-[19ch] text-[26px] leading-[1.28] font-semibold tracking-[-0.021em] text-balance text-tx-invert xl:text-[28px]">
          {headline}
        </p>
      </div>

      <p className="text-[13px] font-medium text-tx-rail-dim">wicket.co.uk</p>
    </section>
  );
}

/**
 * Auth screen shell — brand panel left, form right.
 *
 * 42 / 58. The panel is the *narrower* half: it holds four short things
 * and needs no more, while the form column carries the whole interaction
 * and benefits from the air. Weighting it the other way (which is what
 * v4 did) left the form feeling cramped next to a half-empty poster.
 *
 * There is deliberately **no card** around the form. The fields are
 * filled and the paper is warm, so the column already reads as a single
 * object; boxing it as well drew a second frame inside a screen that is
 * already split down the middle.
 */
export function AuthShell({
  eyebrow,
  headline,
  children,
  className,
}: {
  eyebrow: string;
  headline: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[42fr_58fr]">
      <AuthStatement eyebrow={eyebrow} headline={headline} />

      <section className="flex flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* The panel's stand-in below lg. */}
        <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 lg:hidden">
          <Monogram />
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-tx-head">
            Wicket Travel
          </span>
        </div>

        {/* The legal line travels WITH the form rather than being pinned to
            the bottom of the viewport. Pinned, it drifted a long way from
            the thing it belongs to on a tall screen and read as debris; in
            the flow, the column is one object from eyebrow to copyright. */}
        <div className="flex flex-1 items-center justify-center py-10 lg:py-6">
          <div className={cn("w-full max-w-[440px]", className)}>
            {children}
            <AuthFooter className="mt-11" />
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * The head of an auth form: eyebrow → H1 → lede.
 *
 * The H1 is Figtree at 800 and ~40px — the largest and heaviest thing in
 * the product. It carries the moment on weight alone, which is what a
 * geometric sans can do and what the display serif it replaced could not:
 * the serif read as an invitation, and this reads as a desk.
 */
export function AuthHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div className="mb-9">
      {eyebrow ? (
        <p className="mb-3 font-micro text-coral-ink">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-[36px] text-tx-head sm:text-[40px]">
        {title}
      </h1>
      {lede ? (
        <p className="mt-3 max-w-[46ch] text-[15.5px] leading-[1.6] text-tx-muted">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
