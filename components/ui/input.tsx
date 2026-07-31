import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Field styles — design-system.html §09.
 *
 * 48px tall, 15px padding, 15.5px text, radius 8px, and a border that is
 * ALWAYS visible at rest (1px #D7E1EC) with a real inner shadow, so the field
 * reads as a container rather than appearing only on focus.
 *
 * Exported so <Textarea>, <SelectTrigger> and any native <select> stay
 * pixel-identical to <Input>.
 */
const fieldClassName =
  "w-full min-w-0 rounded-control border border-line-strong bg-surface font-sans text-[15.5px] font-normal text-tx-body shadow-lift-in transition-[color,box-shadow,border-color,background-color] duration-150 ease-brand outline-none placeholder:text-tx-faint hover:border-line-hover focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/12 disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-sunk disabled:text-tx-faint disabled:shadow-none aria-invalid:border-rose aria-invalid:ring-[3px] aria-invalid:ring-rose/10"

function Input({
  className,
  type,
  leadingIcon,
  ...props
}: React.ComponentProps<"input"> & {
  /** 18px Lucide icon, 14px from the left. Field padding becomes 42px. */
  leadingIcon?: React.ReactNode
}) {
  const input = (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClassName,
        "h-12 px-[15px] file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-tx-head",
        leadingIcon && "pl-[42px]",
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
        className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-tx-faint [&_svg]:size-[18px] [&_svg]:[stroke-width:1.75]"
      >
        {leadingIcon}
      </span>
      {input}
    </div>
  )
}

export { Input, fieldClassName }
