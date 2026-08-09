"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { airportShort, inr, netOf, type Ride } from "@/lib/driver/mock";
import { RideStatusBadge } from "@/components/driver/ride-status";
import { Btn, shadowE1 } from "@/components/admin/ui";
import {
  CheckIcon,
  ClockIcon,
  CloseIcon,
  FlightIcon,
  LuggageIcon,
  PinIcon,
  UserIcon,
} from "@/components/admin/icons";

/**
 * The core scannable ride card, used on the Job Board (with accept / decline)
 * and in My Rides (as a link to the record).
 *
 * The route reads top-to-bottom with a connector between the two points — a
 * driver scans "where from, where to" before anything else, and the fare has to
 * be the last thing they see before deciding.
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
  const net = netOf(ride);

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink-500 text-[11.5px] font-medium tabular-nums">
          {ride.ref}
        </span>
        {showStatus ? (
          <RideStatusBadge stage={ride.stage} />
        ) : (
          <span className="border-line-field text-ink-700 inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium">
            {ride.vehicleType}
          </span>
        )}
      </div>

      {/* ------------------------------------------------------ the route */}
      <div className="mt-3.5 flex gap-3">
        <div className="flex flex-none flex-col items-center pt-1">
          <span className="bg-marine-tint text-marine-600 flex size-[26px] flex-none items-center justify-center rounded-full">
            <FlightIcon size={14} />
          </span>
          <span className="bg-line-strong my-1 w-px flex-1" />
          <span className="bg-ember-50 text-ember-700 flex size-[26px] flex-none items-center justify-center rounded-full">
            <PinIcon size={14} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
              Pickup
            </span>
            <span className="text-ink-850 truncate text-[14px] font-medium">
              {airportShort(ride.pickupAirport)} Airport
            </span>
            <span className="text-ink-600 truncate text-[12px] font-normal">
              {ride.pickupPoint}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
              Drop-off
            </span>
            <span className="text-ink-850 truncate text-[14px] font-medium">
              {ride.dropoff}
            </span>
            <span className="text-ink-600 truncate text-[12px] font-normal tabular-nums">
              {ride.distanceKm} km · ~{ride.etaMins} min
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- the meta */}
      <div className="text-ink-600 mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-normal">
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon size={14} />
          {ride.dateLabel}, {ride.timeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FlightIcon size={14} />
          {ride.flight}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserIcon size={14} />
          {ride.passengers}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LuggageIcon size={14} />
          {ride.luggage}
        </span>
      </div>

      {/* ------------------------------------------------------- the fare */}
      <div className="border-line-soft mt-3.5 flex flex-wrap items-end justify-between gap-3 border-t pt-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-poppins text-ink-880 text-[19px] leading-none font-medium tracking-[-0.02em] tabular-nums">
            {inr(ride.fare)}
          </span>
          <span className="text-ink-500 text-[11.5px] font-normal tabular-nums">
            You keep {inr(net)} after fee
          </span>
        </div>
        {href ? (
          <span className="text-marine-600 text-[12.5px] font-medium whitespace-nowrap">
            Details →
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "border-line-base rounded-[12px] border bg-white p-4",
        shadowE1,
        className
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block rounded-[10px] no-underline outline-none hover:no-underline"
        >
          {body}
        </Link>
      ) : (
        body
      )}

      {onAccept ? (
        <div className="mt-3.5 flex items-center gap-2.5">
          <Btn onClick={onDecline} className="flex-1">
            <CloseIcon size={15} />
            Decline
          </Btn>
          <Btn onClick={onAccept} variant="ember" className="flex-[1.5]">
            <CheckIcon size={15} />
            Accept ride
          </Btn>
        </div>
      ) : null}
    </div>
  );
}
