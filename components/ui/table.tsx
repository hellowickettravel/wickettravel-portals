"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table — design system v4 §12, "Hairline rows in a bordered card".
 *
 * Rows are separated by a single very faint line and nothing else. No zebra
 * striping: a table of forty orders should read as one calm block, and the
 * only things carrying colour are the status dots and the values.
 *
 * Header row sits on `sunk` with uppercase micro-labels, 36px tall. Cells
 * take 10px of vertical air at 13.5px — compact density, so roughly twelve
 * rows land above the fold instead of six.
 *
 * Hover is `sunk` and selection is `marine-tint`, deliberately different:
 * rows are hovered constantly while scanning, so the hover has to be the
 * quieter of the two or every pass of the mouse looks like a selection.
 *
 * The wrapper scrolls sideways on its own so the page never does — but a
 * wide table should still fall back to <MobileRecordCard> below md rather
 * than ask anyone to scroll a table on a phone. <DataTable> wires that up.
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
          "w-full caption-bottom border-collapse text-[13.5px] leading-[1.55]",
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
        "border-b border-line-faint transition-colors duration-150 ease-brand hover:bg-sunk has-aria-expanded:bg-sunk data-[state=selected]:bg-marine-tint",
        className
      )}
      {...props}
    />
  )
}

/** Column label — Inter 600, 11px, 0.06em, uppercase. Never sentence case. */
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
        "h-9 px-3 text-left align-middle font-micro whitespace-nowrap text-tx-muted [&:has([role=checkbox])]:pr-0",
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
        "px-3 py-2.5 align-middle text-tx-body whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
      className={cn("mt-3 text-[12.5px] text-tx-muted", className)}
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
