import { cn } from "@/lib/utils";
import { FlightIcon, PinIcon, RouteIcon } from "@/components/admin/icons";

/**
 * Static map stand-in for the ride screen. Live tracking arrives with the real
 * dispatch backend — until then this is an honest placeholder that says so,
 * drawn in the system's own colours rather than a fake map tile.
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
        "border-line-base relative overflow-hidden rounded-[12px] border",
        className
      )}
      role="img"
      aria-label={`Route preview from ${from} to ${to}. Live tracking coming soon.`}
    >
      <div className="bg-surface-2 absolute inset-0" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-line-base) 1px, transparent 1px), linear-gradient(90deg, var(--color-line-base) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M 15% 78% C 40% 60%, 55% 40%, 82% 24%"
          fill="none"
          stroke="var(--color-marine-500)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>

      <span className="bg-marine-500 absolute top-[70%] left-[11%] flex size-8 items-center justify-center rounded-full text-white shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.18)]">
        <FlightIcon size={15} />
      </span>
      <span className="bg-ember-600 absolute top-[16%] right-[13%] flex size-8 items-center justify-center rounded-full text-white shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.18)]">
        <PinIcon size={15} />
      </span>

      <span className="border-line-base text-ink-600 absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border bg-white/92 px-3 py-1.5 text-[11.5px] font-medium backdrop-blur">
        <RouteIcon size={14} />
        Live tracking coming soon
      </span>
    </div>
  );
}
