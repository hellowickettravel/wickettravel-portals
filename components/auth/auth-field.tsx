"use client";

import * as React from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The auth field — design system v5 §16.
 *
 * 56px tall, 16px radius, filled warm, with an uppercase micro label
 * sitting above it. Deliberately larger and softer than the 36px portal
 * field: the front door is three controls on an empty page, and it should
 * feel like something you can hit rather than like a dense form.
 *
 * **On the border.** The reference this is modelled on has none — the fill
 * alone marks the control. That fill is 1.03:1 against its page, which
 * cannot identify a component boundary under WCAG 1.4.11, so a keyboard
 * or low-vision user gets nothing. This keeps a hairline, warm and pinned
 * at the quietest value that still clears 3:1. It is the one place this
 * screen departs from the reference, and it departs on purpose.
 *
 * Focus is where it earns that back: the border goes marine and a 3px
 * ring blooms behind it, which is far louder than the reference's focus
 * state.
 */

const authFieldClassName =
  "h-14 w-full min-w-0 rounded-field border border-field-border bg-field px-4 text-[15px] font-medium text-tx-head transition-[color,box-shadow,border-color,background-color] duration-150 ease-brand outline-none placeholder:font-normal placeholder:text-tx-muted hover:border-line-hover focus-visible:border-marine focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-ruby aria-invalid:ring-[3px] aria-invalid:ring-ruby/15";

export function AuthField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  /** Sits to the right of the label — "Forgot password?" lives here. */
  hint?: React.ReactNode;
  /** Says what to do next — "Add a date so we can check the fare." */
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/field", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="font-micro text-tx-body select-none">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="mt-2 flex items-center gap-1.5 text-[12.5px] leading-[1.5] font-medium text-ruby-ink"
        >
          <CircleAlert aria-hidden className="size-[14px] shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(authFieldClassName, className)} {...props} />;
}

/**
 * Password field with a real show/hide button — not a hover affordance,
 * because half the people using this are on a phone. It is `tabIndex={-1}`
 * so tabbing runs password → submit rather than detouring through it.
 */
export function AuthPasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={cn(authFieldClassName, "pr-14", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-control text-tx-muted outline-none transition-colors duration-150 ease-brand hover:bg-surface-3 hover:text-tx-head"
      >
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

/** Stacks auth fields at the 22px rhythm. */
export function AuthFieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-[22px]", className)} {...props} />;
}

export { authFieldClassName };
