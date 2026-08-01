import { isValidElement } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — design system v4 §9, "Solid, soft-tint, ghost".
 *
 * Three weights, and the gap between them is the whole point:
 *
 *   default      solid coral — THE action. One per screen, never two.
 *   secondary    a soft marine wash, no border. Everything supporting.
 *   ghost        type only. Cancel, dismiss, tertiary.
 *   destructive  a ruby wash that commits to a solid fill on hover.
 *
 * 36px tall at 14px padding (32 small, 42 large) — compact density, so a
 * toolbar reads as a toolbar rather than a row of slabs. Inter 600 at
 * 13.5px; never uppercase, never letterspaced.
 *
 * **Nothing moves.** No shadow, no lift, no translate — hover darkens the
 * fill by exactly one step and active darkens it by one more. A grid of
 * cards or a dense toolbar has to stay still under the cursor, and a
 * button that nudges on press is a button that shifts its neighbours.
 *
 * Focus is a 2px marine ring at 2px offset, which clears 3:1 on every
 * surface it can land on (verified — see DESIGN_SYSTEM.md §3).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-sans font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-brand outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-ruby aria-invalid:ring-[3px] aria-invalid:ring-ruby/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        // Primary — solid coral. The one action on the screen.
        default: "bg-coral text-tx-invert hover:bg-coral-hover active:bg-coral-press",
        // Alias kept so older call sites still land on the primary.
        accent: "bg-coral text-tx-invert hover:bg-coral-hover active:bg-coral-press",
        // Strong secondary — solid marine. Reserved for a second, genuinely
        // heavy action where coral is already spent elsewhere on the screen.
        marine: "bg-marine text-tx-invert hover:bg-marine-deep",
        // Secondary — a soft marine wash, no border.
        secondary:
          "bg-marine-tint text-marine-ink hover:bg-marine-chip aria-expanded:bg-marine-chip",
        // `outline` is an alias, not a fourth weight: the system has three
        // button weights and every call site converges on them.
        outline:
          "bg-marine-tint text-marine-ink hover:bg-marine-chip aria-expanded:bg-marine-chip",
        // Ghost — type only, neutral wash on hover.
        ghost: "bg-transparent text-tx-body hover:bg-sunk hover:text-tx-head aria-expanded:bg-sunk",
        destructive:
          "bg-ruby-tint text-ruby-ink hover:bg-ruby hover:text-tx-invert focus-visible:outline-ruby",
        link: "h-auto px-0 text-marine-ink underline-offset-[3px] decoration-1 hover:underline",
      },
      size: {
        // Desktop: 32 · 36 · 42, padding 12 / 14 / 18 — compact density.
        // Below 640px every control grows to at least 44px, because a 36px
        // target fails the 44×44 minimum for touch. The compact scale is a
        // desktop affordance; it is not worth a mis-tap on a phone.
        sm: "h-9 px-3 text-[12.5px] sm:h-8 [&_svg:not([class*='size-'])]:size-[15px]",
        default: "h-11 px-3.5 text-[13.5px] sm:h-9",
        lg: "h-12 px-[18px] text-[14.5px] sm:h-[42px] [&_svg:not([class*='size-'])]:size-[17px]",
        xs: "h-8 gap-1.5 px-2.5 text-[12px] sm:h-7 [&_svg:not([class*='size-'])]:size-[14px]",
        icon: "size-11 px-0 sm:size-9",
        "icon-xs": "size-8 px-0 sm:size-7 [&_svg:not([class*='size-'])]:size-[14px]",
        "icon-sm": "size-9 px-0 sm:size-8 [&_svg:not([class*='size-'])]:size-[15px]",
        "icon-lg": "size-12 px-0 sm:size-[42px] [&_svg:not([class*='size-'])]:size-[17px]",
      },
    },
    compoundVariants: [
      // Ghost carries tighter padding — there is no fill to balance.
      { variant: "ghost", size: "default", className: "px-2.5" },
      { variant: "ghost", size: "sm", className: "px-2" },
      { variant: "ghost", size: "lg", className: "px-3.5" },
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
