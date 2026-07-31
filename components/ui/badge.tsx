import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — design system v2 §04.
 *
 * 8px radius, 12.5px at 600, 1px border in a darker tint of the same hue.
 * Squared like a printed label — NEVER a pill. A 6px dot only where a live
 * state matters (pass `dot`).
 *
 * The hue is fixed by meaning and reused on every screen: jade confirmed ·
 * sky new · gold in progress · violet waiting · ruby attention ·
 * flame featured.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-chip border px-[11px] py-[5px] text-[12.5px] leading-[1.35] font-semibold whitespace-nowrap transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame [&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        jade: "border-jade-line bg-jade-tint text-jade",
        sky: "border-sky-line bg-sky-tint text-ocean",
        gold: "border-gold-line bg-gold-tint text-gold",
        violet: "border-violet-line bg-violet-tint text-violet",
        ruby: "border-ruby-line bg-ruby-tint text-ruby",
        flame: "border-flame-line bg-flame-tint text-flame",
        neutral: "border-line bg-sunk text-tx-muted",
        // Legacy names kept so existing screens keep rendering on-brand.
        default: "border-sky-line bg-sky-tint text-ocean",
        secondary: "border-line bg-sunk text-tx-muted",
        destructive: "border-ruby-line bg-ruby-tint text-ruby",
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
