import { isValidElement } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — design-system.html §08.
 *
 * Four variants: primary (ocean, the everyday action), accent (coral, one per
 * view maximum), secondary (white + border) and ghost. Type is Hanken 600 at
 * 15px with tracking −0.002em — never uppercase, never letterspaced. Radius is
 * 8px uniform so controls read as controls. Icons are 18px Lucide at 1.75
 * stroke on the leading side, 9px from the label.
 *
 * Hover deepens the fill and the shadow. Buttons do NOT rise — only cards do.
 * Active nudges 1px down. Focus is a 2px coral ring at 3px offset.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-[9px] rounded-control border border-transparent bg-clip-padding font-sans font-semibold tracking-[-0.002em] whitespace-nowrap transition-[background-color,box-shadow,border-color,color,transform] duration-150 ease-brand outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-coral-deep active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-[.42] disabled:shadow-none aria-invalid:border-rose aria-invalid:ring-[3px] aria-invalid:ring-rose/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        // Primary — ocean. The everyday action.
        default:
          "bg-ocean text-tx-invert shadow-btn-ocean hover:bg-ocean-deep hover:shadow-btn-ocean-hover",
        // Accent — coral. One per view, maximum.
        accent:
          "bg-coral-deep text-tx-invert shadow-btn-coral hover:bg-coral-press",
        // Secondary — white, ocean-deep text, visible border.
        secondary:
          "border-line-strong bg-surface text-ocean-deep shadow-lift hover:border-ocean hover:bg-sky-tint aria-expanded:border-ocean aria-expanded:bg-sky-tint",
        outline:
          "border-line-strong bg-surface text-ocean-deep shadow-lift hover:border-ocean hover:bg-sky-tint aria-expanded:border-ocean aria-expanded:bg-sky-tint",
        // Ghost — transparent, ocean text, sky tint on hover.
        ghost:
          "bg-transparent text-ocean hover:bg-sky-tint aria-expanded:bg-sky-tint",
        destructive:
          "bg-rose-tint text-rose border-rose-line hover:bg-rose hover:text-tx-invert hover:border-rose focus-visible:outline-rose",
        link: "h-auto px-0 text-ocean underline-offset-[3px] decoration-1 hover:text-ocean-deep hover:underline",
      },
      size: {
        // 38 · 46 · 54 — padding 16 / 22 / 28.
        sm: "h-[38px] px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        default: "h-[46px] px-[22px] text-[15px]",
        lg: "h-[54px] px-7 text-base [&_svg:not([class*='size-'])]:size-5",
        xs: "h-8 gap-1.5 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        icon: "size-[46px] px-0",
        "icon-xs": "size-8 px-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-[38px] px-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-[54px] px-0 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      // Ghost carries tighter padding — there is no fill to balance.
      { variant: "ghost", size: "default", className: "px-3" },
      { variant: "ghost", size: "sm", className: "px-2.5" },
      { variant: "ghost", size: "lg", className: "px-4" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // Base UI defaults nativeButton=true and warns when `render` produces a
  // non-<button> element (e.g. a Next.js <Link>/<a>). Infer the right value from
  // the rendered element so those call sites don't log an accessibility warning,
  // while an explicit `nativeButton` prop always wins.
  const resolvedNativeButton =
    nativeButton ??
    (render == null || (isValidElement(render) && render.type === "button"))

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={resolvedNativeButton}
      {...props}
    />
  )
}

export { Button, buttonVariants }
