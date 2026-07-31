"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared in-chat back button rendered in the TOP-LEFT of every chat thread header
 * (per-order inbox + conversation inbox). `onClick` decides what "back" means for
 * each surface — close the open thread, or router.back() to the previous view. On
 * mobile this is the primary way to leave an open thread; on-brand + accessible.
 */
export function ChatBackButton({
  onClick,
  label = "Back",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "-ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ocean outline-none transition-colors hover:bg-sunk focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
