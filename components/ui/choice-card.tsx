"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Choice card — design-system.html §09.
 *
 * A full-width tappable card wrapping a real checkbox or radio, so keyboard
 * and screen-reader behaviour is the native one. Selected = ocean border +
 * sky fill + a 1px ocean ring. The 19px box carries a 5px radius; the radio
 * variant is the one place outside avatars and status dots where a circle is
 * allowed, because that is what a radio has to look like.
 */
function ChoiceCard({
  className,
  type = "checkbox",
  title,
  description,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "title"> & {
  type?: "checkbox" | "radio"
  title: React.ReactNode
  description?: React.ReactNode
}) {
  const isRadio = type === "radio"

  return (
    <label
      data-slot="choice-card"
      className={cn(
        "group/choice relative flex cursor-pointer items-start gap-[11px] rounded-control border border-line-strong bg-surface px-[15px] py-[13px] transition-[border-color,background-color,box-shadow] duration-150 ease-brand",
        "hover:border-line-hover hover:bg-sky-tint",
        "has-[:checked]:border-ocean has-[:checked]:bg-sky-tint has-[:checked]:shadow-[0_0_0_1px_var(--ocean)]",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-coral-deep",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-sunk has-[:disabled]:opacity-[.42] has-[:disabled]:hover:border-line-strong",
        className
      )}
    >
      <input type={type} className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-[19px] shrink-0 items-center justify-center border-[1.5px] border-line-strong bg-surface text-transparent transition-[border-color,background-color,color] duration-150 ease-brand peer-checked:border-ocean peer-checked:bg-ocean peer-checked:text-tx-invert",
          isRadio ? "rounded-full" : "rounded-[5px]"
        )}
      >
        {isRadio ? (
          <span className="size-[7px] rounded-full bg-current" />
        ) : (
          <CheckIcon className="size-3" strokeWidth={1.75} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-[1.4] font-medium text-tx-head">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[13px] leading-[1.5] text-tx-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export { ChoiceCard }
