import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Section shell — design system v2 §03 + §09.
 *
 * Sections change by background, not by decoration: alternate canvas → white
 * → sky tint, with an marine statement band once or twice per page. A 1px
 * #E8E0D7 rule top and bottom whenever the background changes.
 *
 * Every fill is one flat colour — the marine band is solid marine ink, not a
 * gradient. `tone="white"` also drops the shadow from any <Card> inside it
 * (see globals.css) so cards stop floating for no reason.
 */
const sectionTones = {
  canvas: "bg-canvas",
  white: "border-y border-line bg-surface",
  sky: "border-y border-line bg-marine-tint",
  marine:
    "bg-rail text-tx-rail-dim [&_h1]:text-tx-invert [&_h2]:text-tx-invert [&_h3]:text-tx-invert [&_h4]:text-tx-invert",
} as const

function Section({
  className,
  tone = "canvas",
  ...props
}: React.ComponentProps<"section"> & { tone?: keyof typeof sectionTones }) {
  return (
    <section
      data-slot="section"
      data-section-tone={tone}
      className={cn(
        // 96 desktop · 72 tablet · 56 mobile
        "py-14 md:py-[72px] lg:py-24",
        sectionTones[tone],
        className
      )}
      {...props}
    />
  )
}

/** 1180px max · 40px gutters desktop · 24px mobile. */
function SectionWrap({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-wrap"
      className={cn("mx-auto w-full max-w-[1440px] px-4 lg:px-6", className)}
      {...props}
    />
  )
}

/**
 * Eyebrow → heading → lede, at the locked 12 / 14 / 32px rhythm.
 * The eyebrow carries a fact — a date, a count, a route.
 */
function SectionHead({
  className,
  eyebrow,
  title,
  lede,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  lede?: React.ReactNode
}) {
  return (
    <div
      data-slot="section-head"
      className={cn("mb-8 max-w-[60ch]", className)}
      {...props}
    >
      {eyebrow ? (
        <span className="mb-3 block font-micro text-coral">{eyebrow}</span>
      ) : null}
      {title ? (
        <h2 className="text-[18px] leading-[1.3] font-semibold tracking-heading text-tx-head">
          {title}
        </h2>
      ) : null}
      {lede ? (
        <p className="mt-3.5 max-w-[58ch] text-[16.5px] leading-[1.7] text-tx-muted">
          {lede}
        </p>
      ) : null}
      {children}
    </div>
  )
}

/**
 * Panel — a bare surface with the clipped corner. Same anatomy as a card
 * without the header/content/footer scaffolding, for tables, lists and
 * anything that manages its own padding.
 */
function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className
      )}
      {...props}
    />
  )
}

export { Section, SectionWrap, SectionHead, Panel }
