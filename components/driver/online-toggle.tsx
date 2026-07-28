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
          "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          online
            ? "bg-emerald-50 ring-emerald-200"
            : "bg-neutral-soft ring-outline",
          className
        )}
      >
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              online ? "bg-emerald-500/15" : "bg-slate-300/40"
            )}
          >
            <span
              className={cn(
                "size-3 rounded-full",
                online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              )}
            />
          </span>
          <span>
            <span className={cn("block text-sm font-semibold", online ? "text-emerald-700" : "text-slate-600")}>
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
        "inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-1.5 text-xs font-semibold ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        online
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-neutral-soft text-slate-600 ring-outline",
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
        )}
      />
      <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
      <Switch checked={online} onCheckedChange={setOnline} size="sm" aria-label="Toggle availability" />
    </button>
  );
}
