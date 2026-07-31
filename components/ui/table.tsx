"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table — the portal's data surface.
 *
 * Header row on #F0F4F9 with Plex Mono micro-labels, 1px #F0F4F9 dividers
 * between rows, 14px of vertical air in every cell, and a sky-tint hover so a
 * row reads as a target. Numbers are tabular wherever a column says so, which
 * is what keeps a fare column aligned on the decimal.
 *
 * The wrapper scrolls sideways on its own so the page never does — but a wide
 * table should still fall back to <MobileRecordCard> below md rather than ask
 * anyone to scroll a table on a phone. <DataTable> wires that up for you.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-collapse text-[14.5px] leading-[1.6]",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-sunk [&_tr]:border-b [&_tr]:border-line", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-line bg-sunk font-medium text-tx-head [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-line-faint transition-colors duration-150 ease-brand hover:bg-sky-tint has-aria-expanded:bg-sky-tint data-[state=selected]:bg-sky-tint",
        className
      )}
      {...props}
    />
  )
}

/** Column label — Plex Mono 11px, 0.1em, uppercase. Never sentence case. */
function TableHead({
  className,
  numeric,
  ...props
}: React.ComponentProps<"th"> & {
  /** Tabular numerals + right alignment, for fares, counts and dates. */
  numeric?: boolean
}) {
  return (
    <th
      data-slot="table-head"
      data-numeric={numeric ? true : undefined}
      className={cn(
        "h-11 px-4 text-left align-middle font-micro whitespace-nowrap text-tx-muted [&:has([role=checkbox])]:pr-0",
        numeric && "tabular text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<"td"> & {
  /** Tabular numerals + right alignment, matching its <TableHead>. */
  numeric?: boolean
}) {
  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric ? true : undefined}
      className={cn(
        "px-4 py-3.5 align-middle text-tx-body whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        numeric && "tabular text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-[13px] text-tx-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
