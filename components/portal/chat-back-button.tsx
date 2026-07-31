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
        "-ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ocean outline-none transition-colors duration-150 ease-brand hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame",
        className
      )}
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
