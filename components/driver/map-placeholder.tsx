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
        "relative overflow-hidden rounded-card border border-line",
        className
      )}
      role="img"
      aria-label={`Map preview from ${from} to ${to}. Live tracking coming soon.`}
    >
      {/* Map-ish backdrop. Flat sky tint plus a stroked SVG grid — a CSS
          gradient grid would be a gradient, and v2 has none anywhere. */}
      <div className="absolute inset-0 bg-marine-tint" />
      <svg className="absolute inset-0 h-full w-full opacity-50" aria-hidden>
        <defs>
          <pattern
            id="map-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="var(--line-hover)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
      </svg>
      {/* Route line */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M 15% 78% C 40% 60%, 55% 40%, 82% 24%"
          fill="none"
          stroke="var(--coral)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>

      {/* Pins */}
      <div className="absolute left-[11%] top-[70%] flex items-center gap-1.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-marine text-white">
          <Plane className="size-3.5 -rotate-45" />
        </span>
      </div>
      <div className="absolute right-[13%] top-[16%] flex items-center gap-1.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-coral text-white">
          <MapPin className="size-3.5" />
        </span>
      </div>

      {/* Live-tracking chip */}
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface px-3 py-1.5 text-xs font-medium text-tx-head">
        <Navigation className="size-3.5 text-coral-hover" />
        Live tracking coming soon
      </div>
    </div>
  );
}
