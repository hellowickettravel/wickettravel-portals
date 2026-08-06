"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { authFieldClass } from "@/components/auth/auth-controls";
import { cn } from "@/lib/utils";

/**
 * Auth password field. Unlike the portal's icon-toggle version this uses a
 * labelled Show/Hide button: it is focusable, reads correctly to a screen
 * reader, and needs no icon legend on the one screen where a mistyped
 * password is the most likely reason someone can't get in.
 */
export function AuthPasswordField({
  className,
  id,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [show, setShow] = useState(false);
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className="relative flex">
      <Input
        id={inputId}
        type={show ? "text" : "password"}
        className={cn(authFieldClass, "pr-[76px]", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-controls={inputId}
        aria-pressed={show}
        className="absolute top-1.5 right-1.5 h-9 rounded-[10px] px-3 text-[13px] font-medium text-brand transition-colors outline-none hover:bg-chip focus-visible:bg-chip focus-visible:ring-3 focus-visible:ring-primary/30"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
