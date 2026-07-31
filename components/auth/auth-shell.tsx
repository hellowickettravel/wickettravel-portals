import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Monogram } from "@/components/brand/monogram";
import { AuthFooter } from "@/components/auth/auth-footer";

/**
 * The ocean statement panel — design system v2 §08.
 *
 * **Solid ocean.** No gradient, no dot texture, no italic pull-quote: a micro
 * label, a 29px heading capped at 15ch, one 15.5px supporting line capped at
 * 34ch, and a single trust line pinned to the foot.
 *
 * Below `lg` it is not rendered at all; the form column grows its own compact
 * brand lockup instead.
 */
function AuthStatement({
  eyebrow,
  headline,
  lede,
}: {
  eyebrow: string;
  headline: ReactNode;
  lede: ReactNode;
}) {
  return (
    <section className="hidden bg-ocean lg:flex lg:flex-col lg:justify-between lg:p-11 xl:p-14">
      {/* Brand lockup */}
      <div className="flex items-center gap-3">
        <Monogram tone="light" />
        <span className="text-[16.5px] font-bold tracking-heading text-tx-invert">
          Wicket Travel
        </span>
      </div>

      {/* The statement. The measures sit on the type itself, not on the
          wrapper — `ch` resolves against the element's own font-size, so a cap
          set on a 16px container would strangle a 29px heading. */}
      <div>
        <p className="font-micro text-white/60">{eyebrow}</p>
        {/* A statement, not a heading. The page's one <h1> is the form's, in
            the card opposite — an <h2> here would put a level 2 above it in
            the document and give screen readers a heading order to untangle. */}
        <p className="mt-3.5 max-w-[15ch] text-[29px] leading-[1.2] font-bold tracking-display text-balance text-tx-invert">
          {headline}
        </p>
        <p className="mt-3 max-w-[34ch] text-[15.5px] leading-[1.6] text-tx-invert-2">
          {lede}
        </p>
      </div>

      {/* The fact at the foot */}
      <div className="flex max-w-md items-start gap-3">
        <span className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-control bg-white/13 text-tx-invert [&_svg]:size-[17px] [&_svg]:[stroke-width:1.75]">
          <ShieldCheck />
        </span>
        <p className="max-w-[42ch] text-[13.5px] leading-[1.6] text-tx-invert-3">
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
  lede,
  children,
  className,
}: {
  eyebrow: string;
  headline: ReactNode;
  /** One supporting line under the statement. Plain text — never a pull-quote. */
  lede: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <AuthStatement eyebrow={eyebrow} headline={headline} lede={lede} />

      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-11 lg:py-11">
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
    <div className="mb-7">
      {eyebrow ? (
        <p className="mb-2.5 font-micro text-flame">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl leading-[1.2] font-bold tracking-heading text-tx-head">
        {title}
      </h1>
      {lede ? (
        <p className="mt-1.5 text-[15px] leading-[1.6] text-tx-muted">{lede}</p>
      ) : null}
    </div>
  );
}
