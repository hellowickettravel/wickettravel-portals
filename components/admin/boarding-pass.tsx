import { cn } from "@/lib/utils";
import { PlaneIcon } from "@/components/admin/icons";
import { Pill, type PillTone } from "@/components/admin/ui";

/**
 * The order detail's boarding pass — the design's signature card. A ticket face
 * carrying the route in Poppins at clamp(30–40px), a dashed perforation, and a
 * price stub with a barcode. Nothing here is decorative filler: every field is
 * the order's own data.
 */
export function BoardingPass({
  carrier,
  reference,
  fromCode,
  fromCity,
  toCode,
  toCity,
  departs,
  returns,
  cabin,
  passengers,
  price,
  priceLabel = "Selling price",
  statusLabel,
  statusTone,
}: {
  carrier: string;
  reference: string;
  fromCode: string;
  fromCity?: string;
  toCode: string;
  toCity?: string;
  departs: string;
  returns: string;
  cabin: string;
  passengers: string;
  price: string;
  /**
   * "Selling price" is what staff call it. The customer portal renders the
   * same pass and says "Total price" — one figure, two audiences.
   */
  priceLabel?: string;
  statusLabel: string;
  statusTone?: PillTone;
}) {
  return (
    <div
      className={cn(
        "border-line-base flex flex-wrap overflow-hidden rounded-[14px] border bg-white",
        "shadow-[0_1px_3px_oklch(0.205_0.038_258_/_0.06)]"
      )}
    >
      {/* ------------------------------------------------ ticket face */}
      <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px] px-[clamp(20px,3vw,34px)] py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <span className="bg-marine-500 block size-[9px] rounded-full" />
            <span className="flex flex-col">
              <span className="text-ink-800 text-[13px] font-semibold">
                {carrier}
              </span>
              <span className="text-ink-500 text-[11px] font-normal tabular-nums">
                {reference}
              </span>
            </span>
          </span>
          <span className="text-marine-mute text-[10.5px] font-semibold tracking-[0.16em] uppercase">
            Boarding pass
          </span>
        </div>

        <div className="flex items-center gap-[clamp(14px,3vw,32px)]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="font-poppins text-ink-880 text-[clamp(30px,3.4vw,40px)] leading-none font-medium tracking-[-0.02em]">
              {fromCode}
            </span>
            <span className="text-ink-600 text-[12.5px] font-normal">
              {fromCity ?? " "}
            </span>
          </div>
          <div className="text-marine-500 flex min-w-[44px] flex-1 items-center gap-2">
            <span className="block h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,oklch(0.505_0.170_257_/_0.38)_0_6px,transparent_6px_12px)]" />
            <span className="flex flex-none rotate-90">
              <PlaneIcon size={26} width={1.5} />
            </span>
            <span className="block h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,oklch(0.505_0.170_257_/_0.38)_0_6px,transparent_6px_12px)]" />
          </div>
          <div className="flex min-w-0 flex-col gap-[3px] text-right">
            <span className="font-poppins text-ink-880 text-[clamp(30px,3.4vw,40px)] leading-none font-medium tracking-[-0.02em]">
              {toCode}
            </span>
            <span className="text-ink-600 text-[12.5px] font-normal">
              {toCity ?? " "}
            </span>
          </div>
        </div>

        <div className="border-line-soft grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-8 gap-y-4 border-t pt-[18px]">
          {[
            { label: "Departs", value: departs },
            { label: "Return", value: returns },
            { label: "Cabin", value: cabin },
            { label: "Passengers", value: passengers },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-[5px]">
              <span className="text-ink-500 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
                {f.label}
              </span>
              <span className="text-ink-800 text-[14px] font-medium">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------- price stub */}
      <div className="border-line-strong bg-surface-5 flex flex-[0_0_210px] flex-col justify-between gap-[18px] border-l-2 border-dashed px-[26px] py-6">
        <div className="flex flex-col gap-2">
          <span className="text-ink-500 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
            {priceLabel}
          </span>
          <span className="font-poppins text-ink-880 text-[27px] leading-none font-semibold tracking-[-0.022em] tabular-nums">
            {price}
          </span>
          <Pill tone={statusTone} className="self-start">
            {statusLabel}
          </Pill>
        </div>
        <span className="block h-9 rounded-[4px] bg-[repeating-linear-gradient(90deg,oklch(0.290_0.028_258)_0_2px,transparent_2px_5px)] opacity-70" />
      </div>
    </div>
  );
}
