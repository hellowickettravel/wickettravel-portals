import { cn } from "@/lib/utils";

/**
 * The Wicket Travel monogram — a 44px flame badge carrying "WT" in Fraunces.
 *
 * This is the one place orange is *identity* rather than action. It reads as
 * a mark, not a button: solid flame, serif letterforms, 12px radius to match
 * the icon chips. Because it is a badge and the active nav item is a line
 * icon, the two never read as the same kind of orange.
 *
 * The `tone` prop is kept so both surfaces stay on one mark — the badge is
 * identical on the ocean rail and on white; only the ring around it changes,
 * which is what keeps it legible against the deep rail without inventing a
 * second logo.
 */
export function Monogram({
  tone = "ocean",
  className,
}: {
  tone?: "light" | "ocean";
  className?: string;
}) {
  return (
    <span
      data-slot="monogram"
      aria-hidden
      className={cn(
        "font-display inline-flex size-11 shrink-0 items-center justify-center rounded-icon bg-flame text-[17px] leading-none font-semibold text-tx-invert",
        tone === "light" && "ring-1 ring-white/15",
        className
      )}
    >
      WT
    </span>
  );
}
