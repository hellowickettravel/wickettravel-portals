import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * Field wrapper — design system v2 §09.
 *
 * Label (7px above) → optional hint (7px above the field) → control →
 * error message (7px below, with a 15px icon). Fields are 20px apart, which
 * is what <FieldGroup> applies: the space between groups is always larger
 * than the space inside one.
 *
 * Error copy says what to do next — "Add a date so we can check the fare."
 * — never "Invalid input".
 */
function Field({
  className,
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="field"
      data-invalid={error ? true : undefined}
      className={cn("group/field", className)}
      {...props}
    >
      {label ? (
        <Label htmlFor={htmlFor} required={required} className="mb-[7px]">
          {label}
        </Label>
      ) : null}
      {hint ? (
        <p className="mb-[7px] text-[13px] leading-[1.5] text-tx-muted">{hint}</p>
      ) : null}
      {children}
      {error ? (
        <p className="mt-[7px] flex items-center gap-1.5 text-[13px] leading-[1.5] text-ruby">
          <CircleAlertIcon
            aria-hidden
            className="size-[15px] shrink-0"
            strokeWidth={1.75}
          />
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Stacks fields at the locked 20px rhythm. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("space-y-5", className)}
      {...props}
    />
  )
}

export { Field, FieldGroup }
