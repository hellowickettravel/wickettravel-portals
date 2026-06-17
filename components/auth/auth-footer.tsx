import { cn } from "@/lib/utils";

/**
 * Brand credit line, pinned to the bottom of the auth form panel. The parent
 * <section> must be `relative` for the absolute positioning to anchor correctly.
 */
export function AuthFooter({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "absolute inset-x-0 bottom-6 px-6 text-center text-xs text-slate-500",
        className
      )}
    >
      © 2026 Wicket Travel. All rights reserved.
    </p>
  );
}
