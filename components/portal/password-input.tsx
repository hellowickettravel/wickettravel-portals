"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with an accessible show/hide toggle. Drop-in replacement for
 * <Input type="password" />, so it inherits the field spec exactly — 48px,
 * visible border, inner shadow, marine focus ring.
 *
 * The toggle is a real button rather than a hover affordance, because half the
 * people using this are on a phone.
 */
export function PasswordInput({
  className,
  id,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [show, setShow] = useState(false);
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={show ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-chip text-tx-faint outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-body"
      >
        {show ? (
          <EyeOff className="size-[18px]" />
        ) : (
          <Eye className="size-[18px]" />
        )}
      </button>
    </div>
  );
}
