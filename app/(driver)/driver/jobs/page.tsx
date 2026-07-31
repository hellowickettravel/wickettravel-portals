"use client";

import { useMemo, useState } from "react";
import { Car, WifiOff, Inbox } from "lucide-react";
import { toast } from "sonner";
import { RideCard } from "@/components/driver/ride-card";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { useDriverStore } from "@/lib/driver/store";
import { AIRPORTS, type Airport } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
            Job Board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobs.length} available airport rides
          </p>
        </div>
      </div>

      {!online ? (
        <div className="flex items-center gap-3 rounded-surface border border-gold-line bg-gold-tint px-4 py-3">
          <WifiOff className="size-4 shrink-0 text-gold" />
          <p className="flex-1 text-xs text-gold">
            You&apos;re offline — go online to accept new rides.
          </p>
          <OnlineToggle />
        </div>
      ) : null}

      {/* Airport filter — it wraps, it never scrolls sideways (v2 §02). */}
      <div>
        <div className="flex flex-wrap gap-2">
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
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ocean/40",
                  active
                    ? "bg-ocean text-tx-invert"
                    : "bg-card text-muted-foreground ring-1 ring-inset ring-line-strong hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-chip px-1.5 py-0.5 text-[10px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-sky-tint text-ocean-deep"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rides */}
      {filtered.length === 0 ? (
        <div className="rounded-surface border border-dashed border-line-strong bg-sunk/60 px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
            <Inbox className="size-6" />
          </div>
          <p className="mt-3 tracking-heading text-sm font-semibold text-tx-head">
            {jobs.length === 0 ? "No rides right now" : "No rides for this airport"}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {jobs.length === 0
              ? "New airport pickups will appear here as they come in. Stay online to catch them first."
              : "Try another airport filter to see more available rides."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              href={`/driver/rides/${ride.id}`}
              onAccept={() => {
                acceptJob(ride.id);
                toast.success("Ride accepted", {
                  description: `${ride.ref} added to your active trip.`,
                });
              }}
              onDecline={() => {
                declineJob(ride.id);
                toast("Ride dismissed", { description: `${ride.ref} removed from the board.` });
              }}
            />
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground">
        <Car className="size-3.5" />
        Fares shown are the total trip fare before commission.
      </p>
    </div>
  );
}
