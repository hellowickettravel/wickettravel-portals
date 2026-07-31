import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Monogram } from "@/components/brand/monogram";
import { AuthFooter } from "@/components/auth/auth-footer";

/**
 * The ocean statement panel. One per auth screen, on the left from `lg` up.
 *
 * It carries the brand mark, a display-size line, and exactly one editorial
 * moment in Newsreader italic — the only place on the page that face appears.
 * Below `lg` it is not rendered at all; the form column grows its own compact
 * brand lockup instead.
 */
function AuthStatement({
  eyebrow,
  headline,
  editorial,
}: {
  eyebrow: string;
  headline: ReactNode;
  editorial: ReactNode;
}) {
  return (
    <section className="relative hidden overflow-hidden bg-[linear-gradient(165deg,var(--ocean)_0%,var(--ocean-deep)_58%,var(--ocean-night)_100%)] lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
      <div
        aria-hidden
        className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_120%_at_30%_0%,black,transparent_75%)]"
      />

      {/* Brand lockup */}
      <div className="relative z-10 flex items-center gap-3">
        <Monogram tone="light" />
        <span className="text-[16.5px] font-bold tracking-heading text-tx-invert">
          Wicket Travel
        </span>
      </div>

      {/* The statement. The measures sit on the type itself, not on the
          wrapper — `ch` resolves against the element's own font-size, so a cap
          set on a 16px container would strangle a 44px heading. */}
      <div className="relative z-10">
        <p className="font-micro text-sky">{eyebrow}</p>
        {/* A statement, not a heading. The page's one <h1> is the form's, in
            the card opposite — an <h2> here would put a level 2 above it in
            the document and give screen readers a heading order to untangle. */}
        <p className="mt-3 max-w-[16ch] text-[32px] leading-[1.08] font-bold tracking-display text-balance text-tx-invert xl:text-[44px]">
          {headline}
        </p>
        <p className="mt-5 max-w-[32ch] font-editorial text-[22px] leading-[1.45] text-tx-invert-2">
          {editorial}
        </p>
      </div>

      {/* The fact at the foot */}
      <div className="relative z-10 flex max-w-md items-start gap-3">
        <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-icon bg-white/10 text-sky [&_svg]:size-5 [&_svg]:[stroke-width:1.75]">
          <ShieldCheck />
        </span>
        <p className="max-w-[42ch] text-[14.5px] leading-[1.6] text-tx-invert-3">
          <span className="font-semibold text-tx-invert-2">Encrypted, and yours.</span>{" "}
          Your bookings and conversations are visible only to you and the people
          you deal with.
        </p>
      </div>
    </section>
  );
}

/**
 * Auth screen shell — statement panel on one side, form card on the other.
 *
 * Everything is left-aligned: the card is centred in its column, but the type
 * inside it starts at the same left edge all the way down, which is what makes
 * a form scan as one column rather than as a poster.
 *
 * On a phone the statement panel drops out entirely and the form becomes a
 * single comfortable column — no squeezed two-up, no sideways scroll.
 */
export function AuthShell({
  eyebrow,
  headline,
  editorial,
  children,
  className,
}: {
  eyebrow: string;
  headline: ReactNode;
  editorial: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <AuthStatement
        eyebrow={eyebrow}
        headline={headline}
        editorial={editorial}
      />

      <section className="flex flex-col px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        {/* Compact brand lockup — the statement panel's stand-in below lg. */}
        <div className="flex items-center gap-3 lg:hidden">
          <Monogram />
          <span className="text-[16.5px] font-bold tracking-heading text-tx-head">
            Wicket Travel
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
          <Card className={cn("w-full max-w-[440px]", className)}>
            <CardContent>{children}</CardContent>
          </Card>
        </div>

        <AuthFooter />
      </section>
    </main>
  );
}

/**
 * The head of an auth card: eyebrow → H1 → lede, at the locked 12 / 14
 * rhythm, then 32px down to the form.
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
    <div className="mb-8">
      {eyebrow ? (
        <p className="mb-3 font-micro text-coral-deep">{eyebrow}</p>
      ) : null}
      <h1 className="text-[25px] leading-[1.26] font-bold tracking-heading text-tx-head">
        {title}
      </h1>
      {lede ? (
        <p className="mt-3.5 text-[14.5px] leading-[1.6] text-tx-muted">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
