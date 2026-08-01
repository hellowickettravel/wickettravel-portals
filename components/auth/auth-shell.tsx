import type { ReactNode } from "react";
import { ShieldCheck, MessagesSquare, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";
import { Monogram } from "@/components/brand/monogram";
import { AuthFooter } from "@/components/auth/auth-footer";
import { BoardingPassArt } from "@/components/auth/boarding-pass-art";

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
 * The marine statement panel — design system v4 §16.
 *
 * Solid marine with boarding-pass line art bleeding off the edges at under
 * 10% white. The art is deliberately pushed to the corners: the centre-left
 * band belongs to the headline and the proof list, and nothing is allowed to
 * run beneath type.
 *
 * Below `lg` it is not rendered at all — the form column grows its own
 * compact brand lockup instead, rather than squashing a two-up layout onto
 * a phone.
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
    <section className="relative hidden overflow-hidden bg-rail lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-14 xl:px-16">
      <BoardingPassArt />

      <div className="relative">
        {/* Brand lockup */}
        <div className="flex items-center gap-3">
          <Monogram tone="light" />
          <span className="text-[15px] font-semibold text-tx-invert">
            Wicket Travel
          </span>
        </div>

        {/* The measures sit on the type itself, not on the wrapper — `ch`
            resolves against the element's own font-size, so a cap set on a
            14px container would strangle a 34px heading. */}
        <p className="mt-12 font-micro text-coral-on-rail">{eyebrow}</p>
        {/* A statement, not a heading. The page's one <h1> is the form's, in
            the column opposite — an <h2> here would put a level 2 above it in
            the document and give screen readers a heading order to untangle. */}
        <p className="mt-4 max-w-[16ch] text-[34px] leading-[1.14] font-semibold tracking-[-0.021em] text-balance text-tx-invert xl:text-[38px]">
          {headline}
        </p>
        <p className="mt-4 max-w-[40ch] text-[14.5px] leading-[1.6] text-tx-rail-dim">
          {lede}
        </p>

        {/* The proof. A hairline sets it apart from the statement without
            drawing a second box on the panel. */}
        <ul className="mt-10 space-y-4 border-t border-white/10 pt-8">
          {PROOF.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-icon bg-white/[0.09] text-coral-on-rail [&_svg]:size-[16px]">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] leading-[1.5] font-semibold text-tx-invert">
                  {title}
                </span>
                <span className="mt-0.5 block max-w-[42ch] text-[12.5px] leading-[1.55] text-tx-rail-dim">
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
 * Auth screen shell — statement panel left, form column right.
 *
 * Asymmetric on purpose. A 50/50 split gave the form column more room than a
 * 420px card could ever use, so the card sat marooned in the middle of it.
 * The statement takes the larger share and the form column is sized to the
 * form.
 *
 * The card, the heading and the footer all share one 420px measure and one
 * left edge, top to bottom. That single alignment is what stops the column
 * reading as three unrelated objects that happen to be stacked.
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
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthStatement eyebrow={eyebrow} headline={headline} lede={lede} />

      <section className="flex flex-col px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        {/* Compact brand lockup — the statement panel's stand-in below lg. */}
        <div className="mx-auto flex w-full max-w-[420px] items-center gap-3 lg:hidden">
          <Monogram />
          <span className="text-[15px] font-semibold text-tx-head">
            Wicket Travel
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 lg:py-6">
          {/* The card is structural, not decorative. Fields are filled, and a
              filled field on the bare canvas is near-invisible — white behind
              them is what gives every input an edge. See §10. */}
          <div
            className={cn(
              "w-full max-w-[420px] rounded-panel border border-line bg-surface px-6 py-7 shadow-card sm:px-8",
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
 * The head of an auth card: eyebrow → H1 → lede.
 *
 * The H1 is the product's one serif moment — Source Serif 4, opted into
 * explicitly here and used on no other screen. It is a sturdy text serif
 * rather than a display face, which is what keeps the front door warm
 * without making it look like an invitation.
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
    <div className="mb-6">
      {eyebrow ? <p className="mb-2.5 font-micro text-coral-ink">{eyebrow}</p> : null}
      <h1 className="font-serif-display text-[30px] leading-[1.18] text-tx-head">
        {title}
      </h1>
      {lede ? (
        <p className="mt-2.5 max-w-[44ch] text-[13.5px] leading-[1.6] text-tx-muted">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
