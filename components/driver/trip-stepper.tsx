import { cn } from "@/lib/utils";
import { TRIP_FLOW, STAGE_META, type TripStage } from "@/lib/driver/mock";
import { CheckCircleIcon } from "@/components/admin/icons";

/**
 * Vertical status flow for a trip: Accepted → Heading → Arrived → On board →
 * On route → Completed.
 *
 * Same track language as the booking wizard's step rail — a done step is the
 * success circle-check, the current one is marine, the rest are outlined. It
 * runs vertically because a driver reads this one-handed on a phone.
 */
export function TripStepper({ stage }: { stage: TripStage }) {
  const currentIdx = TRIP_FLOW.indexOf(stage as (typeof TRIP_FLOW)[number]);

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {TRIP_FLOW.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const last = i === TRIP_FLOW.length - 1;
        return (
          <li key={s} className="flex gap-3.5">
            <div className="flex flex-none flex-col items-center">
              <span
                className={cn(
                  "flex size-[30px] flex-none items-center justify-center rounded-full border-[1.5px] text-[12.5px] font-semibold tabular-nums transition-colors",
                  done
                    ? "border-ok-edge bg-ok-bg text-ok-ink"
                    : current
                      ? "border-marine-500 bg-marine-500 text-white"
                      : "border-line-strong text-ink-500 bg-white"
                )}
              >
                {done ? <CheckCircleIcon size={15} width={2.1} /> : i + 1}
              </span>
              {!last ? (
                <span
                  className={cn(
                    "my-1 w-0.5 flex-1 rounded-full",
                    done ? "bg-ok-edge" : "bg-line-strong"
                  )}
                />
              ) : null}
            </div>

            <div className={cn("flex min-w-0 flex-col gap-0.5", last ? "pb-0" : "pb-5")}>
              <span
                className={cn(
                  "text-[13px] leading-[normal] font-medium",
                  current ? "text-ink-900" : done ? "text-ink-700" : "text-ink-500"
                )}
              >
                {STAGE_META[s].label}
              </span>
              {current ? (
                <span className="text-marine-600 text-[11.5px] font-medium">
                  In progress
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
