"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDriverStore } from "@/lib/driver/store";
import { AIRPORTS, type Airport } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";
import { RideCard } from "@/components/driver/ride-card";
import { OnlineToggle } from "@/components/driver/online-toggle";
import {
  Btn,
  Card,
  EmptyState,
  PageHead,
  Screen,
} from "@/components/admin/ui";
import { AlertIcon, CarIcon } from "@/components/admin/icons";

type Filter = "all" | Airport["code"];

export default function JobBoardPage() {
  const { online, jobs, acceptJob, declineJob } = useDriverStore();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? jobs : jobs.filter((j) => j.pickupAirport === filter)),
    [jobs, filter]
  );

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All airports" },
    ...AIRPORTS.map((a) => ({ value: a.code as Filter, label: a.city })),
  ];

  return (
    <Screen width={1080}>
      <PageHead
        title="Job board"
        intro={`${jobs.length} airport ride${jobs.length === 1 ? "" : "s"} available to accept. Fares shown are the total trip fare before the Wicket fee.`}
      />

      {/* Offline is the one thing that stops this screen working, so it says so
          plainly rather than letting a driver tap Accept into a wall. */}
      {!online ? (
        <div className="border-warn-bg bg-warn-wash flex flex-wrap items-center gap-3 rounded-[12px] border px-5 py-4">
          <span className="text-warn-ink flex flex-none">
            <AlertIcon size={18} />
          </span>
          <span className="text-warn-ink min-w-0 flex-1 text-[12.5px] font-medium text-pretty">
            You&apos;re offline — go online to accept new rides.
          </span>
          <OnlineToggle />
        </div>
      ) : null}

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-2 border-b px-5 py-4">
          {filters.map((f) => {
            const active = filter === f.value;
            const count =
              f.value === "all"
                ? jobs.length
                : jobs.filter((j) => j.pickupAirport === f.value).length;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={cn(
                  "flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                  active
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
                )}
              >
                {f.label}
                <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              jobs.length === 0 ? "No rides right now" : "No rides at this airport"
            }
            body={
              jobs.length === 0
                ? "New airport pickups appear here as they come in. Stay online to catch them first."
                : "Try another airport filter to see the rest of the board."
            }
            action={
              jobs.length > 0 ? (
                <Btn onClick={() => setFilter("all")}>
                  <CarIcon size={15} />
                  Show all airports
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 p-5">
            {filtered.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                href={`/driver/rides/${ride.id}`}
                onAccept={() => {
                  acceptJob(ride.id);
                  toast.success("Ride accepted", {
                    description: `${ride.ref} is now your active trip.`,
                  });
                }}
                onDecline={() => {
                  declineJob(ride.id);
                  toast("Ride dismissed", {
                    description: `${ride.ref} removed from the board.`,
                  });
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </Screen>
  );
}
