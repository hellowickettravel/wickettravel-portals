import type { ReactNode } from "react";
import { Plane } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fare stub — the signature component (design-system.html §10).
 *
 * A boarding pass torn in two: the route and its detail on the left, the fare
 * on the tear-off stub at the right, a dashed perforation between them with a
 * punched notch top and bottom. It is the one place the brand shows its hand,
 * so it is used once per screen — the booking summary — and never as a
 * decorative frame around unrelated content.
 *
 * The notch is a circle filled with the page behind it, which means the stub
 * has to know what it is sitting on. It defaults to `canvas`; pass a
 * different colour through `--stub-notch` if you ever place one on white.
 *
 * Below 620px the tear turns horizontal and the fare drops underneath, which
 * is where the specimen puts it too.
 */

type FareStubMeta = {
  label: string;
  value: ReactNode;
};

/**
 * The stub is drawn for airport codes at 25px. Routes are captured as free
 * text, though, so when someone types "London Heathrow" it steps down to H3
 * rather than blowing the tear-off off the card.
 */
function codeClass(value: string) {
  return cn(
    "font-mono font-medium tracking-[0.01em] text-tx-head",
    value.length <= 4 ? "text-[20px] leading-none" : "text-[16px] leading-[1.36]"
  );
}

export function FareStub({
  from,
  to,
  caption,
  meta = [],
  fare,
  fareLabel = "Fare",
  fareNote,
  className,
}: {
  /** IATA code — "LHR". Rendered in Plex Mono at 25px. */
  from: string;
  to: string;
  /** The long form under the codes: "London Heathrow → Hyderabad". */
  caption?: ReactNode;
  /** Up to three facts along the foot: departs, carrier, stops. */
  meta?: FareStubMeta[];
  /** Pre-formatted money — `gbp()`. */
  fare: ReactNode;
  fareLabel?: string;
  fareNote?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="fare-stub"
      className={cn(
        "flex flex-col rounded-card border border-line bg-surface shadow-card min-[620px]:flex-row",
        "[--stub-notch:var(--canvas)]",
        className
      )}
    >
      {/* ---------- The ticket ---------- */}
      <div className="flex-1 p-6 min-[620px]:px-[26px]">
        <div className="flex flex-wrap items-center gap-x-[13px] gap-y-1">
          <span className={codeClass(from)}>{from}</span>
          {/* The one coral mark on this surface. */}
          <Plane className="size-[17px] shrink-0 -rotate-45 text-coral" aria-hidden />
          <span className={codeClass(to)}>{to}</span>
        </div>

        {caption ? (
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-tx-muted">{caption}</p>
        ) : null}

        {meta.length > 0 ? (
          <dl className="mt-[18px] flex flex-wrap gap-x-[26px] gap-y-3 border-t border-line-faint pt-4">
            {meta.map((item) => (
              <div key={item.label}>
                <dt className="font-micro text-tx-muted">{item.label}</dt>
                <dd className="mt-1 text-[14.5px] font-semibold text-tx-head">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {/* ---------- The perforation ----------
          A 2px dashed rule with a 22px notch punched through each end. The
          notch is a circle of the page colour, centred on the card edge, so
          the card reads as torn rather than merely divided. */}
      <div
        aria-hidden
        className={cn(
          "relative shrink-0",
          "mx-6 h-px border-t-2 border-dashed border-line-strong",
          "min-[620px]:mx-0 min-[620px]:my-5 min-[620px]:h-auto min-[620px]:w-px min-[620px]:border-t-0 min-[620px]:border-l-2",
          // The two notches.
          "before:absolute before:size-[22px] before:rounded-full before:bg-(--stub-notch) before:shadow-card",
          "after:absolute after:size-[22px] after:rounded-full after:bg-(--stub-notch) after:shadow-card",
          // Stacked: notches sit on the left and right edges of the card.
          "before:top-[-11px] before:left-[-31px]",
          "after:top-[-11px] after:right-[-31px]",
          // Side by side: they move to the top and bottom edges.
          "min-[620px]:before:top-[-31px] min-[620px]:before:left-[-11px]",
          "min-[620px]:after:top-auto min-[620px]:after:right-auto min-[620px]:after:bottom-[-31px] min-[620px]:after:left-[-11px]"
        )}
      />

      {/* ---------- The tear-off ---------- */}
      <div className="flex flex-col justify-center p-6 min-[620px]:w-[152px] min-[620px]:shrink-0 min-[620px]:px-[26px]">
        <span className="font-micro text-tx-muted">{fareLabel}</span>
        <p className="tabular mt-1 text-[22px] leading-[1.15] font-semibold tracking-[-0.021em] text-coral-ink">
          {fare}
        </p>
        {fareNote ? (
          <p className="mt-[3px] text-[12.5px] leading-[1.4] text-tx-muted">{fareNote}</p>
        ) : null}
      </div>
    </div>
  );
}
