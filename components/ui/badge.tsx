import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — design system v4 §11.
 *
 * 8px radius, 12px at 600, 1px border in a darker tint of the same hue.
 * Squared like a printed label — never a pill.
 *
 * NOTE: order status does NOT use this. Status is a dot plus plain text
 * (<StatusBadge>), because a badge on every row of a forty-row table turns
 * the status column into a field of coloured blocks. Badges are for the
 * occasional standalone label — a plan tier, a role, a count.
 *
 * Text uses the hue's `-ink` value, which is the variant that inverts
 * correctly in dark mode and clears 4.5:1 on its own tint in both themes.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-chip border px-2 py-[3px] text-[12px] leading-[1.35] font-semibold whitespace-nowrap transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:[stroke-width:1.75]",
  {
    variants: {
      variant: {
        jade: "border-jade-line bg-jade-tint text-jade-ink",
        sky: "border-marine-line bg-marine-tint text-marine-ink",
        gold: "border-gold-line bg-gold-tint text-gold-ink",
        violet: "border-violet-line bg-violet-tint text-violet-ink",
        ruby: "border-ruby-line bg-ruby-tint text-ruby-ink",
        coral: "border-coral-line bg-coral-tint text-coral-ink",
        neutral: "border-line bg-sunk text-tx-muted",
        // Legacy names kept so existing screens keep rendering on-brand.
        default: "border-marine-line bg-marine-tint text-marine-ink",
        secondary: "border-line bg-sunk text-tx-muted",
        destructive: "border-ruby-line bg-ruby-tint text-ruby-ink",
        outline: "border-line-strong bg-surface text-tx-body",
        ghost: "border-transparent bg-transparent text-tx-muted hover:bg-sunk",
        link: "border-transparent bg-transparent text-marine-ink underline-offset-[3px] decoration-1 hover:underline",
        // Solid marine — for counts on an marine surface.
        solid: "border-transparent bg-marine text-tx-invert",
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
