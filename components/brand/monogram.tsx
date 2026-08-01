import { cn } from "@/lib/utils";

/**
 * The Wicket Travel monogram — a 32px coral badge carrying "WT".
 *
 * This is the one place orange is *identity* rather than action. It uses
 * `coral`, the accessible fill, not `coral-vivid`: the letterforms are small
 * white text on the badge, so it owes 4.5:1 like any other label.
 *
 * The `tone` prop keeps both surfaces on one mark — the badge is identical
 * on the marine rail and on white; only the ring around it changes, which is
 * what keeps it legible against the deep rail without inventing a second
 * logo.
 */
export function Monogram({
  tone = "marine",
  className,
}: {
  tone?: "light" | "marine";
  className?: string;
}) {
  return (
    <span
      data-slot="monogram"
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-icon bg-coral text-[12px] leading-none font-bold tracking-[0.01em] text-tx-invert",
        tone === "light" && "ring-1 ring-white/15",
        className
      )}
    >
      WT
    </span>
  );
}
