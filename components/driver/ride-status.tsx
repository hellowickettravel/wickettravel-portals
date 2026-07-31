import { cn } from "@/lib/utils";
import { STAGE_META, type TripStage } from "@/lib/driver/mock";

type Tone = "blue" | "green" | "gold" | "red" | "slate";

const TONE_BG: Record<Tone, string> = {
  blue: "bg-sky-tint text-ocean-deep",
  green: "bg-jade-tint text-jade",
  gold: "bg-gold-tint text-gold",
  red: "bg-ruby-tint text-ruby",
  slate: "bg-sunk text-tx-muted",
};

const TONE_DOT: Record<Tone, string> = {
  blue: "bg-ocean",
  green: "bg-jade",
  gold: "bg-gold",
  red: "bg-ruby",
  slate: "bg-tx-faint",
};

const STAGE_TONE: Record<TripStage, Tone> = {
  available: "blue",
  accepted: "blue",
  heading: "gold",
  arrived: "gold",
  onboard: "gold",
  enroute: "gold",
  completed: "green",
  cancelled: "red",
};

/** Small dot + label pill for a ride's lifecycle stage. */
export function RideStatusBadge({
  stage,
  className,
}: {
  stage: TripStage;
  className?: string;
}) {
  const tone = STAGE_TONE[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_BG[tone],
        className
      )}
    >
      <span className={cn("size-[5px] shrink-0 rounded-full", TONE_DOT[tone])} />
      {STAGE_META[stage].short}
    </span>
  );
}
