import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Field styles — design system v4 §10, "Filled, label above".
 *
 * The fill is `field`, a soft grey wash, so you can see what is editable
 * without reading anything. But a fill alone cannot identify a control:
 * `#f2f4f7` on a white card is 1.05:1, nowhere near the 3:1 WCAG 1.4.11
 * asks of a component boundary. So a filled field carries a real border
 * too — `field-border`, which is pinned at the darkest value that clears
 * 3:1 against the card, the canvas AND its own fill.
 *
 * That is also why a form needs a white card behind it. On the bare canvas
 * the fill and the page are near-identical and the field loses its edges.
 * This is structural, not decorative — see §15.
 *
 * 36px tall at 12px padding, matching <Button size="default"> so a filter
 * bar lines up on one row. Below 640px it grows to 44px for touch, and the
 * text is held at 16px because iOS Safari zooms the viewport on any focused
 * field under that.
 *
 * Exported so <Textarea>, <SelectTrigger> and any native <select> stay
 * pixel-identical to <Input>.
 */
const fieldClassName =
  "w-full min-w-0 rounded-control border border-field-border bg-field font-sans text-base font-normal text-tx-head sm:text-[13.5px] transition-[color,box-shadow,border-color,background-color] duration-150 ease-brand outline-none placeholder:text-tx-muted hover:border-line-hover focus-visible:border-marine focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:border-line disabled:bg-sunk disabled:text-tx-faint aria-invalid:border-ruby aria-invalid:ring-[3px] aria-invalid:ring-ruby/15"

function Input({
  className,
  type,
  size = "default",
  leadingIcon,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** 36px is the standard field; 32px is the compact one, for toolbars. */
  size?: "default" | "sm"
  /** 15px Lucide icon, 12px from the left. Field padding becomes 34px. */
  leadingIcon?: React.ReactNode
}) {
  const compact = size === "sm"

  const input = (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        fieldClassName,
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-tx-head",
        compact ? "h-9 px-2.5 sm:h-8 sm:text-[12.5px]" : "h-11 px-3 sm:h-9",
        leadingIcon && (compact ? "pl-8" : "pl-[34px]"),
        className
      )}
      {...props}
    />
  )

  if (!leadingIcon) return input

  return (
    <div data-slot="input-wrapper" className="relative">
      <span
        aria-hidden
        className={cn(
          // `tx-muted`, not `tx-faint` — a leading icon in a field is doing
          // real work (it says what the field is for), so it has to be
          // readable rather than decorative.
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tx-muted [&_svg]:[stroke-width:1.75]",
          compact ? "left-2.5 [&_svg]:size-[14px]" : "left-3 [&_svg]:size-[15px]"
        )}
      >
        {leadingIcon}
      </span>
      {input}
    </div>
  )
}

export { Input, fieldClassName }
