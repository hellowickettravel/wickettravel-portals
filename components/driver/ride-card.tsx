"use client";

import Link from "next/link";
import {
  Plane,
  MapPin,
  Clock,
  Users,
  Luggage,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideStatusBadge } from "@/components/driver/ride-status";
import { airportShort, inr, type Ride } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

/**
 * The core scannable ride card. Used on the Job Board (with accept / decline)
 * and in My Rides (as a link to the record). Built mobile-first: route line
 * reads top-to-bottom, meta chips wrap, fare and action anchor the bottom.
 */
export function RideCard({
  ride,
  href,
  onAccept,
  onDecline,
  showStatus,
  className,
}: {
  ride: Ride;
  href?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  showStatus?: boolean;
  className?: string;
}) {
  const net = ride.fare - ride.commission;

  const body = (
    <>
      {/* Top row: ref + status/vehicle */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {ride.ref}
        </span>
        {showStatus ? (
          <RideStatusBadge stage={ride.stage} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-chip bg-marine-tint px-2.5 py-1 text-xs font-medium text-marine">
            {ride.vehicleType}
          </span>
        )}
      </div>

      {/* Route */}
      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-control bg-marine/10 text-marine">
            <Plane className="size-3.5 -rotate-45" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pickup
            </p>
            <p className="truncate text-sm font-semibold text-tx-head">
              {airportShort(ride.pickupAirport)} Airport
            </p>
            <p className="truncate text-xs text-muted-foreground">{ride.pickupPoint}</p>
          </div>
        </div>
        <div className="ml-3 h-3 border-l border-dashed border-line-strong" />
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-control bg-coral/10 text-coral-hover">
            <MapPin className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Drop-off
            </p>
            <p className="truncate text-sm font-semibold text-tx-head">{ride.dropoff}</p>
            <p className="text-xs text-muted-foreground">
              {ride.distanceKm} km · ~{ride.etaMins} min
            </p>
          </div>
        </div>
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {ride.dateLabel}, {ride.timeLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Plane className="size-3.5" />
          {ride.flight}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {ride.passengers}
        </span>
        <span className="inline-flex items-center gap-1">
          <Luggage className="size-3.5" />
          {ride.luggage}
        </span>
      </div>

      {/* Fare */}
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="tracking-heading text-lg font-bold text-tx-head">{inr(ride.fare)}</p>
          <p className="text-[11px] text-muted-foreground">You earn {inr(net)} after fee</p>
        </div>
        {href ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-marine">
            Details <ArrowRight className="size-4" />
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "rounded-card bg-card p-4 border border-line shadow-card transition-shadow",
        className
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block rounded-control outline-none focus-visible:ring-2 focus-visible:ring-marine/40"
        >
          {body}
        </Link>
      ) : (
        body
      )}

      {onAccept ? (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onDecline}
            className="flex-1"
          >
            <X className="size-4" />
            Decline
          </Button>
          <Button type="button" onClick={onAccept} className="flex-[1.6]">
            <Check className="size-4" />
            Accept ride
          </Button>
        </div>
      ) : null}
    </div>
  );
}
