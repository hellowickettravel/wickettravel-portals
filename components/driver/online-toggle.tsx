"use client";

import { Switch } from "@/components/ui/switch";
import { useDriverStore } from "@/lib/driver/store";
import { cn } from "@/lib/utils";

/**
 * Online / Offline availability toggle. Shared across the app via the driver
 * store, so flipping it in the header also updates the dashboard hero. `size`
 * lets the dashboard render a larger, more prominent version.
 */
export function OnlineToggle({
  size = "compact",
  className,
}: {
  size?: "compact" | "full";
  className?: string;
}) {
  const { online, setOnline } = useDriverStore();

  if (size === "full") {
    return (
      <button
        type="button"
        onClick={() => setOnline(!online)}
        aria-pressed={online}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-card px-4 py-3.5 text-left ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-marine/40",
          online
            ? "bg-jade-tint ring-jade-line"
            : "bg-sunk ring-line-strong",
          className
        )}
      >
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-icon",
              online ? "bg-jade/15" : "bg-line-hover/40"
            )}
          >
            <span
              className={cn(
                "size-3 rounded-full",
                online ? "bg-jade animate-pulse" : "bg-tx-faint"
              )}
            />
          </span>
          <span>
            <span className={cn("block text-sm font-semibold", online ? "text-jade" : "text-tx-muted")}>
              {online ? "You're Online" : "You're Offline"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {online ? "Receiving new ride requests" : "Not receiving requests"}
            </span>
          </span>
        </span>
        <Switch checked={online} onCheckedChange={setOnline} aria-label="Toggle availability" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOnline(!online)}
      aria-pressed={online}
      className={cn(
        "inline-flex items-center gap-2 rounded-control py-1.5 pl-2.5 pr-1.5 text-xs font-semibold ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-marine/40",
        online
          ? "bg-jade-tint text-jade ring-jade-line"
          : "bg-sunk text-tx-muted ring-line-strong",
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          online ? "bg-jade animate-pulse" : "bg-tx-faint"
        )}
      />
      <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
      <Switch checked={online} onCheckedChange={setOnline} size="sm" aria-label="Toggle availability" />
    </button>
  );
}
