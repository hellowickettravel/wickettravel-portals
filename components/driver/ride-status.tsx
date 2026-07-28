import { cn } from "@/lib/utils";
import { STAGE_META, type TripStage } from "@/lib/driver/mock";

type Tone = "blue" | "green" | "amber" | "red" | "slate";

const TONE_BG: Record<Tone, string> = {
  blue: "bg-chip text-brand-dark",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
};

const TONE_DOT: Record<Tone, string> = {
  blue: "bg-brand",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-slate-400",
};

const STAGE_TONE: Record<TripStage, Tone> = {
  available: "blue",
  accepted: "blue",
  heading: "amber",
  arrived: "amber",
  onboard: "amber",
  enroute: "amber",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_BG[tone],
        className
      )}
    >
      <span className={cn("size-[5px] shrink-0 rounded-full", TONE_DOT[tone])} />
      {STAGE_META[stage].short}
    </span>
  );
}
