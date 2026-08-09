"use client";

import { useMemo, useState } from "react";
import { useDriverStore } from "@/lib/driver/store";
import type { Ride } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";
import { RideCard } from "@/components/driver/ride-card";
import { Btn, Card, EmptyState, PageHead, Screen } from "@/components/admin/ui";
import { CarIcon } from "@/components/admin/icons";

type TabKey = "upcoming" | "active" | "completed" | "cancelled";

const TAB_META: Record<TabKey, { label: string; empty: string }> = {
  upcoming: {
    label: "Upcoming",
    empty: "Nothing accepted yet. Take a ride from the job board and it will show up here.",
  },
  active: { label: "Active", empty: "No trip in progress right now." },
  completed: {
    label: "Completed",
    empty: "Your finished trips land here, with what you earned on each one.",
  },
  cancelled: { label: "Cancelled", empty: "No cancelled rides — nice and clean." },
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

  return (
    <Screen width={1080}>
      <PageHead
        title="My rides"
        intro="Everything you've accepted — in progress, finished and cancelled."
      />

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-2 border-b px-5 py-4">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={active}
                className={cn(
                  "flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                  active
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
                )}
              >
                {TAB_META[t].label}
                <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
                  {buckets[t].length}
                </span>
              </button>
            );
          })}
        </div>

        {rides.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body={TAB_META[tab].empty}
            action={
              tab === "upcoming" || tab === "active" ? (
                <Btn as="link" href="/driver/jobs" variant="ember">
                  <CarIcon size={15} />
                  Open the job board
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 p-5">
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
      </Card>
    </Screen>
  );
}
