import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldClassName } from "@/components/ui/input"

/** Textarea — min 96px, 13px vertical padding, resize vertical only (v2 §08). */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClassName,
        "block min-h-24 resize-y px-3.5 py-[13px] leading-[1.6]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
