"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Navigation, CircleCheck, Ban } from "lucide-react";
import { RideCard } from "@/components/driver/ride-card";
import { useDriverStore } from "@/lib/driver/store";
import type { Ride } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

type TabKey = "upcoming" | "active" | "completed" | "cancelled";

const TAB_META: Record<
  TabKey,
  { label: string; empty: string; icon: typeof CalendarClock }
> = {
  upcoming: {
    label: "Upcoming",
    empty: "No upcoming rides. Accept one from the Job Board and it'll show up here.",
    icon: CalendarClock,
  },
  active: {
    label: "Active",
    empty: "No trip in progress right now.",
    icon: Navigation,
  },
  completed: {
    label: "Completed",
    empty: "Your completed trips will appear here once you finish a ride.",
    icon: CircleCheck,
  },
  cancelled: {
    label: "Cancelled",
    empty: "No cancelled rides — nice and clean.",
    icon: Ban,
  },
};

export default function MyRidesPage() {
  const { activeRide, history } = useDriverStore();
  const [tab, setTab] = useState<TabKey>("active");

  const buckets = useMemo(() => {
    const all: Ride[] = [...(activeRide ? [activeRide] : []), ...history];
    return {
      upcoming: all.filter((r) => r.bucket === "upcoming"),
      active: all.filter((r) => r.bucket === "active"),
      completed: all.filter((r) => r.bucket === "completed"),
      cancelled: all.filter((r) => r.bucket === "cancelled"),
    };
  }, [activeRide, history]);

  const tabs: TabKey[] = ["upcoming", "active", "completed", "cancelled"];
  const rides = buckets[tab];
  const EmptyIcon = TAB_META[tab].icon;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
          My Rides
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your accepted, active and past trips
        </p>
      </div>

      {/* Tabs — they wrap, they never scroll sideways (v2 §02). */}
      <div>
        <div className="flex flex-wrap gap-1 rounded-surface bg-sunk p-1">
          {tabs.map((t) => {
            const active = tab === t;
            const count = buckets[t].length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ocean/40",
                  active
                    ? "bg-card text-tx-head"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {TAB_META[t].label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "rounded-chip px-1.5 text-[10px] font-semibold",
                      active ? "bg-sky-tint text-ocean-deep" : "bg-line-strong/60 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {rides.length === 0 ? (
        <div className="rounded-surface border border-dashed border-line-strong bg-sunk/60 px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
            <EmptyIcon className="size-6" />
          </div>
          <p className="mt-3 tracking-heading text-sm font-semibold text-tx-head">
            Nothing here yet
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {TAB_META[tab].empty}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              href={`/driver/rides/${ride.id}`}
              showStatus
            />
          ))}
        </div>
      )}
    </div>
  );
}
