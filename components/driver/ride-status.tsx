import { Pill, type PillTone } from "@/components/admin/ui";
import { STAGE_META, type TripStage } from "@/lib/driver/mock";

/**
 * A ride's lifecycle stage as the design's status pill: tint fill, dark ink,
 * no dot. Everything mid-trip is the warn hue — its own hue, never Ember,
 * which stays reserved for actions.
 */
const STAGE_TONE: Record<TripStage, PillTone> = {
  available: "marine",
  accepted: "marine",
  heading: "warn",
  arrived: "warn",
  onboard: "warn",
  enroute: "warn",
  completed: "ok",
  cancelled: "ink",
};

export function RideStatusBadge({
  stage,
  className,
}: {
  stage: TripStage;
  className?: string;
}) {
  return (
    <Pill tone={STAGE_TONE[stage]} className={className}>
      {STAGE_META[stage].short}
    </Pill>
  );
}
