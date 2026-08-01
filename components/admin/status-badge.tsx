import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/db/types";

/**
 * Status — design system v4 §11, "Dot and text, no container".
 *
 * A small coloured dot next to normal-weight text. No pill, no fill, no
 * border. This is the single biggest reason a forty-row orders table now
 * reads calmly: a badge on every row turns the status column into a field
 * of coloured blocks that competes with the data, while a 6px dot says the
 * same thing and then gets out of the way.
 *
 * The dot carries the meaning and the word carries the detail, so this is
 * never colour-alone — it degrades correctly for anyone who cannot
 * distinguish the hues.
 *
 * The hue is fixed by meaning and does not vary for visual interest:
 *
 *   violet  waiting, not yet started
 *   marine  live, being worked on
 *   jade    confirmed, completed, paid
 *   ruby    cancelled, failed, needs attention
 *   gold    money
 *   neutral inert, archived, no account
 */

/** The tone vocabulary. `blue`/`green`/`red`/`slate` are legacy aliases. */
export type Tone =
  | "marine"
  | "violet"
  | "jade"
  | "gold"
  | "ruby"
  | "neutral"
  | "blue"
  | "green"
  | "red"
  | "slate";

const DOT: Record<Tone, string> = {
  marine: "bg-marine",
  violet: "bg-violet",
  jade: "bg-jade",
  gold: "bg-gold",
  ruby: "bg-ruby",
  neutral: "bg-tx-faint",
  // legacy aliases
  blue: "bg-marine",
  green: "bg-jade",
  red: "bg-ruby",
  slate: "bg-tx-faint",
};

export function StatusBadge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  /** Kept for call-site compatibility. The dot is the design; hiding it
   *  leaves a bare word, which is only right inside an already-labelled
   *  column. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="status"
      className={cn(
        "inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-tx-body",
        className
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}

/** The live dot, on its own — for a header or an avatar corner. */
export function StatusDot({
  tone = "neutral",
  className,
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0 rounded-full", DOT[tone], className)}
    />
  );
}

/* ---------------------------------------------------------------- orders -- */

const ORDER_STATUS = {
  new: { tone: "violet", label: "New" },
  in_progress: { tone: "marine", label: "In progress" },
  completed: { tone: "jade", label: "Completed" },
  cancelled: { tone: "ruby", label: "Cancelled" },
} as const satisfies Record<OrderStatus, { tone: Tone; label: string }>;

/**
 * The order lifecycle. One definition, used by every screen that shows an
 * order — dashboard, orders, transactions, order detail, customers — so
 * `in_progress` is marine everywhere and reads "In progress", never
 * "In_progress".
 */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { tone, label } = ORDER_STATUS[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}

/** Plain label for an order status — CSV exports, aria-labels, filter chips. */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS[status].label;
}

/** The tone for an order status. */
export function orderStatusTone(status: OrderStatus): Tone {
  return ORDER_STATUS[status].tone;
}

/** Map a free-text status string to a tone. */
export function orderTone(status: string): Tone {
  switch (status) {
    case "Open":
    case "New":
      return "violet";
    case "In Progress":
    case "Pending":
      return "marine";
    case "Closed":
    case "Completed":
    case "Confirmed":
      return "jade";
    case "Cancelled":
      return "ruby";
    default:
      return "neutral";
  }
}
