import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Icon chip — design-system.html §07.
 *
 * 42px square, 12px radius, the hue at 9–16% background, holding a 20px
 * Lucide icon at 1.75 stroke. Chips carry meaning, not decoration:
 * ocean for volume · amber for money · indigo for waiting · mint for
 * confirmed · rose for attention · coral for featured.
 */
const iconChipVariants = cva(
  "inline-flex size-[42px] shrink-0 items-center justify-center rounded-icon [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      tone: {
        ocean: "bg-ocean/10 text-ocean",
        coral: "bg-coral-tint text-coral-deep",
        amber: "bg-amber/16 text-amber-deep",
        mint: "bg-mint/11 text-mint",
        indigo: "bg-indigo/10 text-indigo",
        rose: "bg-rose/9 text-rose",
        neutral: "bg-sunk text-tx-muted",
      },
    },
    defaultVariants: {
      tone: "ocean",
    },
  }
)

function IconChip({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof iconChipVariants>) {
  return (
    <span
      data-slot="icon-chip"
      className={cn(iconChipVariants({ tone }), className)}
      {...props}
    />
  )
}

export { IconChip, iconChipVariants }
