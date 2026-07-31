import { cn } from "@/lib/utils";

/**
 * The Wicket Travel monogram — a 44px badge carrying "WT" in Hanken 700.
 *
 * Used where the full wordmark would be too wide or too quiet: the sidebar
 * rail and the auth screens. It takes `rounded-icon`, the same 11px the icon
 * chips use, so brand and iconography sit on one radius.
 *
 * `tone="light"` is the badge on an ocean surface; `tone="ocean"` is the badge
 * on a white one. Flat fill either way — no shadow, no gradient.
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
        "inline-flex size-11 shrink-0 items-center justify-center rounded-icon font-sans text-[14.5px] leading-none font-bold tracking-ui",
        tone === "light" ? "bg-surface text-ocean" : "bg-ocean text-tx-invert",
        className
      )}
    >
      WT
    </span>
  );
}
