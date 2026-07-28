"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plane,
  MapPin,
  Clock,
  Users,
  Luggage,
  Car,
  Phone,
  MessageSquare,
  ArrowRight,
  Check,
  X,
  CircleCheck,
  Ban,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapPlaceholder } from "@/components/driver/map-placeholder";
import { TripStepper } from "@/components/driver/trip-stepper";
import { RideStatusBadge } from "@/components/driver/ride-status";
import { useDriverStore } from "@/lib/driver/store";
import { airportLabel, airportShort, STAGE_META, inr } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

export default function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { rideById, activeRide, acceptJob, declineJob, startTrip, advanceStage, cancelActive } =
    useDriverStore();

  const ride = rideById(id);

  if (!ride) {
    return (
      <div className="animate-in fade-in duration-300">
        <BackBar onBack={() => router.push("/driver/jobs")} />
        <div className="mt-10 rounded-2xl border border-dashed border-outline bg-neutral-soft/60 px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
            <Car className="size-6" />
          </div>
          <p className="mt-3 font-display text-sm font-semibold text-navy">Ride not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This ride is no longer available or has been completed.
          </p>
          <Button
            render={<Link href="/driver/jobs" />}
            variant="outline"
            className="mt-4 h-10 rounded-xl"
          >
            Back to Job Board
          </Button>
        </div>
      </div>
    );
  }

  const isAvailable = ride.stage === "available";
  const isActive = activeRide?.id === ride.id;
  const isClosed = ride.stage === "completed" || ride.stage === "cancelled";
  const nextLabel = STAGE_META[ride.stage].nextLabel;
  const net = ride.fare - ride.commission;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <BackBar onBack={() => router.back()} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ride.ref}
          </p>
          <h1 className="font-display text-xl font-semibold tracking-tight text-navy">
            {airportShort(ride.pickupAirport)} → {ride.dropoff}
          </h1>
        </div>
        <RideStatusBadge stage={ride.stage} />
      </div>

      {/* Map */}
      <MapPlaceholder
        from={`${airportShort(ride.pickupAirport)} Airport`}
        to={ride.dropoff}
        className="h-44 sm:h-52"
      />

      {/* Status flow (only for accepted/active trips) */}
      {isActive && !isClosed ? (
        <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 shadow-card">
          <h2 className="mb-4 font-display text-sm font-semibold text-navy">Trip progress</h2>
          <TripStepper stage={ride.stage} />
        </div>
      ) : null}

      {/* Closed banner */}
      {isClosed ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1",
            ride.stage === "completed"
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-rose-50 ring-rose-200"
          )}
        >
          {ride.stage === "completed" ? (
            <CircleCheck className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <Ban className="size-5 shrink-0 text-rose-600" />
          )}
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                ride.stage === "completed" ? "text-emerald-700" : "text-rose-700"
              )}
            >
              {ride.stage === "completed" ? "Trip completed" : "Trip cancelled"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ride.stage === "completed"
                ? `You earned ${inr(net)} on this ride.`
                : "This ride was cancelled and won't be counted."}
            </p>
          </div>
        </div>
      ) : null}

      {/* Customer */}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-chip font-semibold text-brand-dark">
              {ride.customerName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">{ride.customerName}</p>
              <p className="text-xs text-muted-foreground">{ride.customerPhone}</p>
            </div>
          </div>
        </div>
        {!isClosed ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              render={<Link href="/driver/messages" />}
              variant="outline"
              className="h-11 rounded-xl"
            >
              <MessageSquare className="size-4" />
              Message
            </Button>
            <Button
              onClick={() =>
                toast("Calling customer", { description: ride.customerPhone })
              }
              variant="outline"
              className="h-11 rounded-xl"
            >
              <Phone className="size-4" />
              Call
            </Button>
          </div>
        ) : null}
      </div>

      {/* Trip details */}
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 shadow-card">
        <h2 className="mb-3 font-display text-sm font-semibold text-navy">Trip details</h2>

        <div className="space-y-3">
          <DetailRow icon={Plane} label="Pickup" value={airportLabel(ride.pickupAirport)} sub={ride.pickupPoint} accent="brand" />
          <DetailRow icon={MapPin} label="Drop-off" value={ride.dropoff} sub={ride.dropoffFull} accent="orange" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <MetaItem icon={Clock} label="Pickup time" value={`${ride.dateLabel}, ${ride.timeLabel}`} />
          <MetaItem icon={Plane} label="Flight" value={ride.flight} />
          <MetaItem icon={Car} label="Vehicle" value={ride.vehicleType} />
          <MetaItem icon={Users} label="Passengers" value={String(ride.passengers)} />
          <MetaItem icon={Luggage} label="Luggage" value={`${ride.luggage} bags`} />
          <MetaItem icon={MapPin} label="Distance" value={`${ride.distanceKm} km · ~${ride.etaMins} min`} />
        </div>
      </div>

      {/* Fare breakdown */}
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 shadow-card">
        <h2 className="mb-3 font-display text-sm font-semibold text-navy">Fare</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Trip fare</dt>
            <dd className="font-medium text-foreground">{inr(ride.fare)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Wicket commission (15%)</dt>
            <dd className="font-medium text-rose-600">− {inr(ride.commission)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="font-semibold text-navy">You earn</dt>
            <dd className="font-display text-base font-bold text-emerald-700">{inr(net)}</dd>
          </div>
        </dl>
      </div>

      {/* Sticky action bar */}
      {!isClosed ? (
        <div className="sticky bottom-24 z-20 -mx-4 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0">
          {isAvailable ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  declineJob(ride.id);
                  toast("Ride dismissed");
                  router.push("/driver/jobs");
                }}
                className="h-12 flex-1 rounded-xl"
              >
                <X className="size-4" />
                Decline
              </Button>
              <Button
                onClick={() => {
                  acceptJob(ride.id);
                  toast.success("Ride accepted", { description: ride.ref });
                }}
                className="h-12 flex-[1.6] rounded-xl"
              >
                <Check className="size-4" />
                Accept ride
              </Button>
            </div>
          ) : isActive && nextLabel ? (
            <div className="space-y-2">
              <Button
                onClick={() => {
                  const wasFinal = ride.stage === "enroute";
                  advanceStage(ride.id);
                  if (wasFinal) {
                    toast.success("Trip completed 🎉", {
                      description: `You earned ${inr(net)}.`,
                    });
                    router.push("/driver/rides");
                  } else {
                    toast.success(nextLabel);
                  }
                }}
                className="h-12 w-full rounded-xl text-[15px]"
              >
                {ride.stage === "enroute" ? (
                  <CircleCheck className="size-5" />
                ) : (
                  <ArrowRight className="size-5" />
                )}
                {nextLabel}
              </Button>
              <button
                type="button"
                onClick={() => {
                  cancelActive(ride.id);
                  toast("Trip cancelled");
                  router.push("/driver/rides");
                }}
                className="flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-rose-600 outline-none transition-colors hover:text-rose-700 focus-visible:underline"
              >
                Cancel this trip
              </button>
            </div>
          ) : (
            <Button
              onClick={() => {
                startTrip(ride.id);
                toast.success("Trip resumed", { description: ride.ref });
              }}
              className="h-12 w-full rounded-xl"
            >
              Resume this trip
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Plane;
  label: string;
  value: string;
  sub?: string;
  accent: "brand" | "orange";
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          accent === "brand" ? "bg-brand/10 text-brand" : "bg-orange/10 text-orange-dark"
        )}
      >
        <Icon className={cn("size-4", accent === "brand" && "-rotate-45")} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-navy">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
