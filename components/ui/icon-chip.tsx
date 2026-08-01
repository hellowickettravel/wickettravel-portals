import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Icon chip — design system v4 §8.
 *
 * 32px square, 10px radius, a **flat** fill one step deeper than the hue's
 * tint, holding a 17px Lucide icon at 1.75 stroke. Solid, never an alpha
 * wash, so the chip still separates if it ever sits on a surface painted in
 * its own hue.
 *
 * The glyph uses the hue's `-ink` value rather than the hue itself. That is
 * not a stylistic preference: `gold` on `gold-chip` measures 2.92:1, just
 * under the 3:1 a meaningful icon owes, and `-ink` takes it to 4.6:1 while
 * flipping correctly in dark mode.
 *
 * Chips carry meaning, not decoration: marine volume · gold money · violet
 * waiting · jade confirmed · ruby attention · coral featured.
 */
const iconChipVariants = cva(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-icon [&_svg]:size-[17px] [&_svg]:shrink-0 [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      tone: {
        marine: "bg-marine-chip text-marine-ink",
        coral: "bg-coral-chip text-coral-ink",
        gold: "bg-gold-chip text-gold-ink",
        jade: "bg-jade-chip text-jade-ink",
        violet: "bg-violet-chip text-violet-ink",
        ruby: "bg-ruby-chip text-ruby-ink",
        neutral: "bg-sunk text-tx-muted",
      },
    },
    defaultVariants: {
      tone: "marine",
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
