import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Icon chip — design system v2 §06.
 *
 * 40px square, 11px radius, a **flat** fill one step deeper than the hue's
 * tint, holding a 19px Lucide icon at 1.75 stroke. Solid, never an alpha
 * wash — so the chip still separates when it sits on a stat card painted in
 * that same hue. Chips carry meaning, not decoration: ocean for volume ·
 * gold for money · violet for waiting · jade for confirmed · ruby for
 * attention · flame for featured.
 */
const iconChipVariants = cva(
  "inline-flex size-10 shrink-0 items-center justify-center rounded-icon [&_svg]:size-[19px] [&_svg]:shrink-0 [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      tone: {
        ocean: "bg-sky-chip text-ocean",
        flame: "bg-flame-chip text-flame",
        gold: "bg-gold-chip text-gold",
        jade: "bg-jade-chip text-jade",
        violet: "bg-violet-chip text-violet",
        ruby: "bg-ruby-chip text-ruby",
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
