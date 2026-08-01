import { Check } from "lucide-react";
import { TRIP_FLOW, STAGE_META, type TripStage } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

/**
 * Vertical status flow for a trip: Accepted → Heading → Arrived → On board →
 * On route → Completed. Completed steps get an orange check, the current step
 * pulses, upcoming steps are muted. Vertical reads best on a phone.
 */
export function TripStepper({ stage }: { stage: TripStage }) {
  const currentIdx = TRIP_FLOW.indexOf(stage as (typeof TRIP_FLOW)[number]);

  return (
    <ol className="space-y-0">
      {TRIP_FLOW.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const last = i === TRIP_FLOW.length - 1;
        return (
          <li key={s} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-chip text-xs font-semibold transition-colors",
                  done && "bg-coral text-white",
                  current && "bg-marine text-white ring-4 ring-marine/15",
                  !done && !current && "bg-sunk text-muted-foreground ring-1 ring-inset ring-line-strong"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              {!last ? (
                <span
                  className={cn(
                    "my-1 w-0.5 flex-1 rounded-full",
                    i < currentIdx ? "bg-coral" : "bg-line-strong"
                  )}
                />
              ) : null}
            </div>
            {/* Label */}
            <div className={cn("pb-5", last && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-7",
                  current ? "text-tx-head" : done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {STAGE_META[s].label}
              </p>
              {current ? (
                <p className="-mt-1 text-xs text-coral-hover">In progress</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
