import { cn } from "@/lib/utils";

/**
 * Brand credit line at the foot of the auth form column. It sits in flow at
 * the bottom of the flex column — left-aligned, mirroring the fact pinned to
 * the bottom of the ocean statement panel opposite.
 */
export function AuthFooter({ className }: { className?: string }) {
  return (
    <p className={cn("text-[13px] leading-[1.5] text-tx-faint", className)}>
      © 2026 Wicket Travel. All rights reserved.
    </p>
  );
}
