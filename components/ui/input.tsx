import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Field styles — design system v2 §08.
 *
 * 46px tall, 14px padding, 15.5px text, radius 10px, and a border that is
 * ALWAYS visible at rest (1px #D3DCE7) with a real inner shadow, so the field
 * reads as a container rather than appearing only on focus.
 *
 * One deliberate deviation from the scale: below 640px the text is held at
 * 16px. iOS Safari zooms the whole viewport when you focus a field under 16px,
 * and 15.5px lands just the wrong side of that line. Desktop keeps the 15.5px.
 *
 * Exported so <Textarea>, <SelectTrigger> and any native <select> stay
 * pixel-identical to <Input>.
 *
 * `size="sm"` is the 36px compact field — the same height <SelectTrigger
 * size="sm"> and <Button size="sm"> use, so a filter bar lines up on one row.
 * Forms always use the 46px default.
 */
const fieldClassName =
  "w-full min-w-0 rounded-control border border-line-strong bg-surface font-sans text-base font-normal tracking-ui text-tx-body shadow-lift-in sm:text-[15.5px] transition-[color,box-shadow,border-color,background-color] duration-150 ease-brand outline-none placeholder:text-tx-faint hover:border-line-hover focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/13 disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-sunk disabled:text-tx-faint disabled:shadow-none aria-invalid:border-ruby aria-invalid:ring-[3px] aria-invalid:ring-ruby/10"

function Input({
  className,
  type,
  size = "default",
  leadingIcon,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** 46px is the form size; 36px is the compact one, for filter bars. */
  size?: "default" | "sm"
  /** 17px Lucide icon, 14px from the left. Field padding becomes 42px. */
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
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-tx-head",
        compact ? "h-9 px-3 sm:text-sm" : "h-[46px] px-3.5",
        leadingIcon && (compact ? "pl-[34px]" : "pl-[42px]"),
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
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tx-faint [&_svg]:[stroke-width:1.75]",
          compact
            ? "left-2.5 [&_svg]:size-4"
            : "left-[14px] [&_svg]:size-[17px]"
        )}
      >
        {leadingIcon}
      </span>
      {input}
    </div>
  )
}

export { Input, fieldClassName }
