import { Navigation, MapPin, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Static map stand-in for the Active Trip screen. Real live tracking arrives in
 * a later phase — for now this is a styled placeholder with pickup/drop pins so
 * the layout reads correctly. Uses a faint grid + route line, no external tiles.
 */
export function MapPlaceholder({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-foreground/10",
        className
      )}
      role="img"
      aria-label={`Map preview from ${from} to ${to}. Live tracking coming soon.`}
    >
      {/* Map-ish backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--sky-tint)_0%,var(--surface-sunk)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--line-hover) 1px, transparent 1px), linear-gradient(90deg, var(--line-hover) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Route line */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M 15% 78% C 40% 60%, 55% 40%, 82% 24%"
          fill="none"
          stroke="var(--coral-deep)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>

      {/* Pins */}
      <div className="absolute left-[11%] top-[70%] flex items-center gap-1.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-ocean text-white shadow-md">
          <Plane className="size-3.5 -rotate-45" />
        </span>
      </div>
      <div className="absolute right-[13%] top-[16%] flex items-center gap-1.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-coral-deep text-white shadow-md">
          <MapPin className="size-3.5" />
        </span>
      </div>

      {/* Live-tracking chip */}
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ocean-deep shadow-sm backdrop-blur">
        <Navigation className="size-3.5 text-coral-press" />
        Live tracking coming soon
      </div>
    </div>
  );
}
