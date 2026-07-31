"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Form label — design-system.html §09.
 * 700 · 13.5px · #17293A · sentence case. Sits 8px above its field.
 * Required is marked with a flame asterisk, never with "(required)".
 */
function Label({
  className,
  children,
  required,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[13.5px] leading-none font-bold text-tx-head select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="-ml-1.5 text-flame">
          *
        </span>
      ) : null}
    </label>
  )
}

export { Label }
