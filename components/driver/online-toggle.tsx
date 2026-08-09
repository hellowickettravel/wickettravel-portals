"use client";

import { useDriverStore } from "@/lib/driver/store";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/ui";

/**
 * Online / Offline availability. Shared across the app via the driver store, so
 * flipping it in the top bar also updates the dashboard.
 *
 * Availability is the one thing a driver changes constantly and the one thing
 * that must never be ambiguous, so both sizes state it in words as well as
 * colour: success tint when live, neutral when not.
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
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-[12px] border px-5 py-4 transition-colors",
          online
            ? "border-ok-edge bg-ok-wash"
            : "border-line-base bg-surface-1",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-3.5">
          <span
            className={cn(
              "flex size-10 flex-none items-center justify-center rounded-full",
              online ? "bg-ok-bg" : "bg-neutral-bg"
            )}
          >
            <span
              className={cn(
                "block size-3 rounded-full",
                online ? "bg-ok-ink animate-pulse" : "bg-ink-450"
              )}
            />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                "text-[13.5px] font-semibold",
                online ? "text-ok-ink" : "text-ink-700"
              )}
            >
              {online ? "You're online" : "You're offline"}
            </span>
            <span className="text-ink-600 text-[12px] font-normal">
              {online
                ? "Receiving new ride requests"
                : "Not receiving ride requests"}
            </span>
          </span>
        </span>
        <Toggle
          checked={online}
          onChange={setOnline}
          label="Toggle availability"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOnline(!online)}
      aria-pressed={online}
      className={cn(
        "inline-flex h-10 flex-none items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-medium whitespace-nowrap outline-none transition-colors",
        online
          ? "border-ok-edge bg-ok-wash text-ok-ink"
          : "border-line-field text-ink-600 bg-white",
        className
      )}
    >
      <span
        className={cn(
          "block size-2 flex-none rounded-full",
          online ? "bg-ok-ink animate-pulse" : "bg-ink-450"
        )}
      />
      {online ? "Online" : "Offline"}
    </button>
  );
}
