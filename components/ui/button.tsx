import { isValidElement } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — design system v3 §07, "Compact, and flame leads".
 *
 * Flame is the primary action colour, so `default` is flame and there is one
 * of them per view. `ocean` is the strong secondary — navigation-style
 * actions. Everything quieter is `secondary`, `ghost` or `link`.
 *
 * 44px tall at 18px padding (38 small, 50 large). Type is Manrope 700 at 15px
 * — never uppercase, never letterspaced; Manrope is even enough at this size
 * that the old negative tracking is no longer needed and has been dropped.
 * Radius is 12px uniform so controls read as controls. Icons are 17px Lucide
 * at 1.75 stroke on the leading side, 8px from the label.
 *
 * Hover darkens the fill by exactly one step. **Buttons carry no shadow and
 * never rise** — only cards do. Active nudges 1px down. Focus is a 2px flame
 * ring at 2px offset.
 *
 * Quiet variants hover onto `sand`, not `sky-tint`: on a warm canvas a cool
 * blue wash on hover looked like a selection state rather than a hover.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-sans font-bold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-brand outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[.42] aria-invalid:border-ruby aria-invalid:ring-[3px] aria-invalid:ring-ruby/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[17px] [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        // Primary — flame. The main action, one per view.
        default: "bg-flame text-tx-invert hover:bg-flame-hover",
        // Kept as an alias so older call sites still land on the primary.
        accent: "bg-flame text-tx-invert hover:bg-flame-hover",
        // Strong secondary — ocean. Navigation-style actions.
        ocean: "bg-ocean text-tx-invert hover:bg-ocean-deep",
        // Secondary — white, visible border, warms on hover. No shadow.
        secondary:
          "border-line-strong bg-surface text-tx-head hover:border-line-hover hover:bg-sand aria-expanded:border-line-hover aria-expanded:bg-sand",
        outline:
          "border-line-strong bg-surface text-tx-head hover:border-line-hover hover:bg-sand aria-expanded:border-line-hover aria-expanded:bg-sand",
        // Ghost — transparent, ocean text, warm wash on hover.
        ghost:
          "bg-transparent text-ocean-deep hover:bg-sand aria-expanded:bg-sand",
        destructive:
          "bg-ruby-tint text-ruby border-ruby-line hover:bg-ruby hover:text-tx-invert hover:border-ruby focus-visible:outline-ruby",
        link: "h-auto px-0 text-ocean underline-offset-[3px] decoration-1 hover:text-ocean-deep hover:underline",
      },
      size: {
        // 38 · 44 · 50 — padding 14 / 18 / 22.
        sm: "h-[38px] px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        default: "h-11 px-[18px] text-[15px]",
        lg: "h-[50px] px-[22px] text-[15.5px] [&_svg:not([class*='size-'])]:size-[18px]",
        xs: "h-8 gap-1.5 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        icon: "size-11 px-0",
        "icon-xs": "size-8 px-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-[38px] px-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-[50px] px-0 [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    compoundVariants: [
      // Ghost carries tighter padding — there is no fill to balance.
      { variant: "ghost", size: "default", className: "px-[11px]" },
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
