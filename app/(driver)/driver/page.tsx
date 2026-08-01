"use client";

import Link from "next/link";
import {
  Car,
  Wallet,
  Star,
  ArrowRight,
  Navigation,
  MapPin,
  Plane,
  Clock,
  ChevronRight,
} from "lucide-react";
import { StatTile } from "@/components/driver/stat-tile";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { RideStatusBadge } from "@/components/driver/ride-status";
import { Button } from "@/components/ui/button";
import { useDriverStore } from "@/lib/driver/store";
import { DRIVER, TODAY_STATS, STAGE_META, airportShort, inr } from "@/lib/driver/mock";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHomePage() {
  const { online, activeRide, jobs } = useDriverStore();
  const firstName = DRIVER.name.split(" ")[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-2xl font-semibold tracking-tight text-tx-head">
          {firstName}
        </h1>
      </div>

      {/* Availability */}
      <OnlineToggle size="full" />

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Rides today" value={String(TODAY_STATS.rides)} icon={Car} />
        <StatTile label="Earned today" value={inr(TODAY_STATS.earnings)} icon={Wallet} accent />
        <StatTile label="Rating" value={TODAY_STATS.rating.toFixed(1)} icon={Star} hint="last 30 days" />
      </div>

      {/* Active trip */}
      {activeRide ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="tracking-heading text-sm font-semibold text-tx-head">Active trip</h2>
            <RideStatusBadge stage={activeRide.stage} />
          </div>
          <div className="rounded-card bg-marine p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-medium tracking-[0.11em] text-coral-vivid uppercase">
                  {activeRide.ref}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/18 px-2.5 py-1 text-[11px] font-medium text-white">
                  <Navigation className="size-3 text-coral-vivid" />
                  {STAGE_META[activeRide.stage].label}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-white">
                  <Plane className="size-4 shrink-0 -rotate-45 text-coral-vivid" />
                  <span className="text-sm font-medium">
                    {airportShort(activeRide.pickupAirport)} Airport · {activeRide.pickupPoint}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-white">
                  <MapPin className="size-4 shrink-0 text-coral-vivid" />
                  <span className="text-sm font-medium">{activeRide.dropoff}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-3 text-xs text-white/75">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {activeRide.timeLabel}
                  </span>
                  <span>{activeRide.customerName}</span>
                </div>
                <span className="tracking-heading text-lg font-bold text-white">
                  {inr(activeRide.fare)}
                </span>
              </div>

              <Button
                render={<Link href={`/driver/rides/${activeRide.id}`} />}
                className="mt-4"
              >
                Continue trip
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-line-strong bg-sunk/60 p-5 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-card bg-marine-tint text-marine-deep">
            <Car className="size-5" />
          </div>
          <p className="mt-3 tracking-heading text-sm font-semibold text-tx-head">No active trip</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {online
              ? "You're online — accept a ride from the Job Board to get started."
              : "Go online to start receiving ride requests."}
          </p>
        </div>
      )}

      {/* Job board shortcut */}
      <Link
        href="/driver/jobs"
        className="flex items-center gap-4 rounded-card bg-card p-4 border border-line shadow-card outline-none transition-shadow hover:shadow-pop focus-visible:ring-2 focus-visible:ring-marine/40"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-coral/10 text-coral-hover">
          <Car className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tracking-heading text-sm font-semibold text-tx-head">
            {jobs.length} rides available now
          </p>
          <p className="text-xs text-muted-foreground">
            Airport pickups near you — accept your next trip
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>

      {/* Earnings shortcut */}
      <Link
        href="/driver/earnings"
        className="flex items-center gap-4 rounded-card bg-card p-4 border border-line shadow-card outline-none transition-shadow hover:shadow-pop focus-visible:ring-2 focus-visible:ring-marine/40"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-marine-tint text-marine-deep">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tracking-heading text-sm font-semibold text-tx-head">This week&apos;s earnings</p>
          <p className="text-xs text-muted-foreground">See your payouts & commission breakdown</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
