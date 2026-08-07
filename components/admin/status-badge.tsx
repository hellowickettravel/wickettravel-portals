import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

/**
 * Status pill. The tone map lives in `globals.css` under `.wt-pill[data-tone]`:
 * the portals keep their dot + semantic tint, and inside `.admin-root` the same
 * markup becomes the Admin Portal design's pill — tint fill with dark ink, no
 * dot, 11px/500. Blue resolves to Marine and amber to the design's own Warning
 * hue, so a status can never be confused with the Ember accent.
 */
export function StatusBadge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span data-tone={tone} className={cn("wt-pill", className)}>
      <span className="wt-pill-dot" />
      {children}
    </span>
  );
}

/** Map an order status to a badge tone. */
export function orderTone(status: string): Tone {
  switch (status) {
    case "Open":
    case "New":
      return "blue";
    case "In Progress":
    case "Pending":
      return "amber";
    case "Closed":
    case "Completed":
    case "Confirmed":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "slate";
  }
}
