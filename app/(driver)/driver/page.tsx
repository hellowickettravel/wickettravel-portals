"use client";

import Link from "next/link";
import { useDriverStore } from "@/lib/driver/store";
import {
  DRIVER,
  STAGE_META,
  TODAY_STATS,
  airportShort,
  inr,
  netOf,
} from "@/lib/driver/mock";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { RideStatusBadge } from "@/components/driver/ride-status";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHead,
  Screen,
} from "@/components/admin/ui";
import {
  ArrowRightIcon,
  CarIcon,
  ClockIcon,
  FlightIcon,
  HeartIcon,
  PinIcon,
  PoundIcon,
  RouteIcon,
} from "@/components/admin/icons";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHomePage() {
  const { online, activeRide, jobs } = useDriverStore();
  const firstName = DRIVER.name.split(" ")[0];

  return (
    <Screen width={1080}>
      <PageHead
        title={`${greeting(new Date().getHours())}, ${firstName}`}
        intro={
          online
            ? "You're online and visible on the board."
            : "You're offline — go online to start receiving requests."
        }
        actions={
          <Btn as="link" href="/driver/jobs" variant="ember">
            <CarIcon size={15} />
            Job board
          </Btn>
        }
      />

      {/* --------------------------------------------------- availability */}
      <OnlineToggle size="full" />

      {/* ---------------------------------------------------------- today */}
      <KpiGrid>
        <Kpi
          label="Rides today"
          value={TODAY_STATS.rides}
          meta="Completed since midnight"
          tone="marine"
          icon={<RouteIcon size={18} />}
        />
        <Kpi
          label="Earned today"
          value={inr(TODAY_STATS.earnings)}
          meta="After the Wicket fee"
          tone="ok"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="Rating"
          value={TODAY_STATS.rating.toFixed(1)}
          meta="Average over the last 30 days"
          tone="warn"
          icon={<HeartIcon size={18} />}
        />
      </KpiGrid>

      {/* ---------------------------------------------------- active trip */}
      <Card>
        <CardHead
          title="Active trip"
          hint={
            activeRide
              ? `${activeRide.ref} · ${STAGE_META[activeRide.stage].label}`
              : "Nothing in progress right now"
          }
          action={activeRide ? <RideStatusBadge stage={activeRide.stage} /> : undefined}
        />
        {activeRide ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex gap-3">
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
                    {airportShort(activeRide.pickupAirport)} Airport
                  </span>
                  <span className="text-ink-600 truncate text-[12px] font-normal">
                    {activeRide.pickupPoint}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                    Drop-off
                  </span>
                  <span className="text-ink-850 truncate text-[14px] font-medium">
                    {activeRide.dropoff}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-line-soft flex flex-wrap items-end justify-between gap-3 border-t pt-4">
              <div className="text-ink-600 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-normal">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon size={14} />
                  {activeRide.timeLabel}
                </span>
                <span>{activeRide.customerName}</span>
              </div>
              <span className="font-poppins text-ink-880 text-[19px] leading-none font-medium tracking-[-0.02em] tabular-nums">
                {inr(netOf(activeRide))}
              </span>
            </div>

            <Btn
              as="link"
              href={`/driver/rides/${activeRide.id}`}
              variant="marine"
              className="w-full"
            >
              Continue trip
              <ArrowRightIcon size={15} />
            </Btn>
          </div>
        ) : (
          <EmptyState
            title="No active trip"
            body={
              online
                ? "You're online — accept a ride from the job board and it will appear here."
                : "Go online to start receiving ride requests."
            }
            action={
              online ? (
                <Btn as="link" href="/driver/jobs" variant="ember">
                  <CarIcon size={15} />
                  Open the job board
                </Btn>
              ) : undefined
            }
          />
        )}
      </Card>

      {/* ------------------------------------------------------- shortcuts */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <Link
          href="/driver/jobs"
          className="border-line-base hover:border-ink-300 hover:bg-surface-1 flex items-center gap-4 rounded-[12px] border bg-white p-5 no-underline shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)] transition-colors hover:no-underline"
        >
          <span className="bg-marine-wash text-marine-600 flex size-11 flex-none items-center justify-center rounded-[11px]">
            <CarIcon size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-ink-800 text-[13.5px] font-semibold">
              {jobs.length} ride{jobs.length === 1 ? "" : "s"} on the board
            </span>
            <span className="text-ink-600 text-[12px] font-normal">
              Airport pickups waiting to be accepted
            </span>
          </span>
          <span className="text-marine-600 flex flex-none">
            <ArrowRightIcon size={17} />
          </span>
        </Link>

        <Link
          href="/driver/earnings"
          className="border-line-base hover:border-ink-300 hover:bg-surface-1 flex items-center gap-4 rounded-[12px] border bg-white p-5 no-underline shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)] transition-colors hover:no-underline"
        >
          <span className="bg-ok-wash text-ok-ink flex size-11 flex-none items-center justify-center rounded-[11px]">
            <PoundIcon size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-ink-800 text-[13.5px] font-semibold">
              This week&apos;s earnings
            </span>
            <span className="text-ink-600 text-[12px] font-normal">
              Payouts and the fee breakdown per ride
            </span>
          </span>
          <span className="text-marine-600 flex flex-none">
            <ArrowRightIcon size={17} />
          </span>
        </Link>
      </div>
    </Screen>
  );
}
