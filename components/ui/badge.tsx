import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — design-system.html §10.
 *
 * 6px radius, 12.5px at 600, 1px border in a darker tint of the same hue.
 * Squared like a printed label — NEVER a pill. A 6px dot only where a live
 * state matters (pass `dot`).
 *
 * The hue is fixed by meaning and reused on every screen: mint confirmed ·
 * sky new · amber in progress · indigo waiting · rose attention ·
 * coral featured.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-[7px] rounded-chip border px-[11px] py-[5px] text-[12.5px] leading-[1.35] font-semibold tracking-[-0.002em] whitespace-nowrap transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep [&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        mint: "border-mint-line bg-mint-tint text-mint",
        sky: "border-sky-line bg-sky-tint text-ocean",
        amber: "border-amber-line bg-amber-tint text-amber-deep",
        indigo: "border-indigo-line bg-indigo-tint text-indigo",
        rose: "border-rose-line bg-rose-tint text-rose",
        coral: "border-coral-line bg-coral-tint text-coral-deep",
        neutral: "border-line bg-sunk text-tx-muted",
        // Legacy names kept so existing screens keep rendering on-brand.
        default: "border-sky-line bg-sky-tint text-ocean",
        secondary: "border-line bg-sunk text-tx-muted",
        destructive: "border-rose-line bg-rose-tint text-rose",
        outline: "border-line-strong bg-surface text-tx-body",
        ghost: "border-transparent bg-transparent text-tx-muted hover:bg-sunk",
        link: "border-transparent bg-transparent text-ocean underline-offset-[3px] decoration-1 hover:underline",
        // Solid ocean — for counts on an ocean surface.
        solid: "border-transparent bg-ocean text-tx-invert",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  dot,
  children,
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** 6px live-state dot in the badge's own hue. */
    dot?: boolean
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot ? (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-current"
              />
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
