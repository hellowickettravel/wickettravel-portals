import type { ReactNode } from "react";
import { ShieldCheck, MessagesSquare, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";
import { Monogram } from "@/components/brand/monogram";
import { AuthFooter } from "@/components/auth/auth-footer";

/** The three things the panel promises. Facts, not adjectives. */
const PROOF = [
  {
    icon: Ticket,
    title: "Every fare in one ledger",
    body: "Orders, payments and status, tracked from enquiry to issued ticket.",
  },
  {
    icon: MessagesSquare,
    title: "The conversation sits with it",
    body: "No lost threads — the chat lives on the order it belongs to.",
  },
  {
    icon: ShieldCheck,
    title: "Encrypted, and yours",
    body: "Visible only to you and the people you deal with.",
  },
];

/**
 * The ocean statement panel.
 *
 * v2 pinned three blocks to the corners with `justify-between`, which left a
 * lake of empty navy in the middle and made the panel read as unfinished. This
 * one is a single centred column: lockup, statement, then three proof rows that
 * give the space structure and something to actually read.
 *
 * Depth comes from a large outlined ring bleeding off the corner — flat stroke,
 * no gradient, no texture. It reads as a horizon rather than as decoration.
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
    <section className="relative hidden overflow-hidden bg-ocean-ink lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-14 xl:px-16">
      {/* Horizon rings — flat strokes, no gradient. Both are pushed well off
          the bottom-right corner so they read as a soft horizon behind the
          panel rather than as a line drawn through the text. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-56 -bottom-64 size-[620px] rounded-full border border-white/[0.06]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-80 size-[520px] rounded-full border border-white/[0.04]"
      />

      <div className="relative">
        {/* Brand lockup */}
        <div className="flex items-center gap-3.5">
          <Monogram tone="light" />
          <span className="font-display text-[19px] font-semibold text-tx-invert">
            Wicket Travel
          </span>
        </div>

        {/* The statement. The measures sit on the type itself, not on the
            wrapper — `ch` resolves against the element's own font-size, so a
            cap set on a 16px container would strangle a 38px heading. */}
        <p className="mt-14 font-micro text-flame-vivid">{eyebrow}</p>
        {/* A statement, not a heading. The page's one <h1> is the form's, in
            the column opposite — an <h2> here would put a level 2 above it in
            the document and give screen readers a heading order to untangle. */}
        <p className="font-display mt-5 max-w-[16ch] text-[38px] leading-[1.12] font-semibold text-balance text-tx-invert xl:text-[43px]">
          {headline}
        </p>
        <p className="mt-5 max-w-[38ch] text-[16px] leading-[1.65] text-tx-invert-2">
          {lede}
        </p>

        {/* The proof. A hairline sets it apart from the statement without
            drawing a second box on the panel. */}
        <ul className="mt-12 space-y-5 border-t border-white/10 pt-10">
          {PROOF.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-icon bg-white/[0.09] text-flame-vivid [&_svg]:size-[17px]">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] leading-[1.5] font-semibold text-tx-invert">
                  {title}
                </span>
                <span className="mt-0.5 block max-w-[40ch] text-[13.5px] leading-[1.55] text-tx-invert-3">
                  {body}
                </span>
              </span>
            </li>
          ))}
        </ul>
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
    /* Asymmetric on purpose. A 50/50 split gave the form column more room
       than a 440px card could ever use, so the card sat marooned in the
       middle of it. The statement panel takes the larger share and the form
       column is sized to the form. */
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <AuthStatement eyebrow={eyebrow} headline={headline} lede={lede} />

      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
        {/* Compact brand lockup — the statement panel's stand-in below lg. */}
        <div className="flex items-center gap-3.5 lg:hidden">
          <Monogram />
          <span className="font-display text-[19px] font-semibold text-tx-head">
            Wicket Travel
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
          {/* The card is doing real work, not decoration: fields are `sand`,
              and sand sitting directly on the sand canvas is almost invisible.
              White behind them is what gives every input an edge. It also
              stops the form floating in the middle of an empty column. */}
          <div
            className={cn(
              "w-full max-w-[440px] rounded-surface-lg border border-line bg-surface px-8 py-9 shadow-lift sm:px-10",
              className
            )}
          >
            {children}
          </div>
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
        <p className="mb-3 font-micro text-flame">{eyebrow}</p>
      ) : null}
      {/* Fraunces, via the base h1 rule — this is the one display moment on
          the form side, and it is what makes the screen feel like a brand
          rather than a login. */}
      <h1 className="text-[32px] leading-[1.15] font-semibold text-tx-head">
        {title}
      </h1>
      {lede ? (
        <p className="mt-3 max-w-[42ch] text-[15.5px] leading-[1.65] text-tx-muted">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
