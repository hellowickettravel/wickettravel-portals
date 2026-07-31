import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card — design system v2 §04 + §09.
 *
 * #FFFFFF, 1px #E5EBF3, 14px radius, lift-1. Padding is 20–24px on desktop
 * and 18px on mobile; `size="sm"` is the portal-screen density.
 *
 * A card sitting inside a white <Section> keeps its border and drops its
 * shadow — otherwise it floats for no reason. That rule lives in globals.css
 * as `[data-section-tone="white"] [data-slot="card"]`.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-surface border border-line bg-card py-(--card-spacing) text-sm text-card-foreground shadow-lift",
        "[--card-px:18px] [--card-spacing:18px] md:[--card-px:24px] md:[--card-spacing:22px]",
        "data-[size=sm]:[--card-px:16px] data-[size=sm]:[--card-spacing:16px] md:data-[size=sm]:[--card-px:20px] md:data-[size=sm]:[--card-spacing:18px]",
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-2.5 px-(--card-px) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/** H3 card title — 600 · 16.5/23 · #0C3355. */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[16.5px] leading-[1.42] font-semibold text-tx-head group-data-[size=sm]/card:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

/** Small — 400 · 14.5/23 · #6D7D8F. */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[14.5px] leading-[1.6] text-tx-muted", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-px)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 border-t border-line-faint bg-sunk px-(--card-px) py-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
