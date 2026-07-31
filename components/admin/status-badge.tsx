import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/types";

/**
 * Status badge — a thin naming layer over <Badge>.
 *
 * The badge itself (6px radius, squared like a printed label, 1px border in a
 * darker tint of its own hue) lives in `components/ui/badge.tsx`. This file
 * exists to fix the *mapping*: a status's colour comes from what it means,
 * never from wanting some variety across a table.
 *
 *   sky     new, unstarted            indigo  waiting on someone
 *   amber   in progress, money        mint    confirmed, active, done
 *   rose    cancelled, attention      neutral inert, archived, no account
 */

/** The legacy tone vocabulary, kept so existing screens keep rendering. */
export type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

const TONE_VARIANT = {
  blue: "sky",
  green: "mint",
  amber: "amber",
  red: "rose",
  slate: "neutral",
  violet: "indigo",
} as const;

export function StatusBadge({
  tone = "slate",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  /** The 6px live dot. Only for states that are genuinely running. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant={TONE_VARIANT[tone]} dot={dot} className={className}>
      {children}
    </Badge>
  );
}

/* ---------------------------------------------------------------- orders -- */

const ORDER_STATUS = {
  new: { variant: "sky", label: "New", dot: false },
  in_progress: { variant: "amber", label: "In progress", dot: true },
  completed: { variant: "mint", label: "Completed", dot: false },
  cancelled: { variant: "rose", label: "Cancelled", dot: false },
} as const;

/**
 * The order lifecycle, badged. One definition, used by every screen that
 * shows an order — dashboard, orders, transactions, order detail, customers —
 * so `in_progress` is amber everywhere and reads "In progress", not
 * "In_progress".
 */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { variant, label, dot } = ORDER_STATUS[status];
  return (
    <Badge variant={variant} dot={dot} className={className}>
      {label}
    </Badge>
  );
}

/** Plain label for an order status — CSV exports, aria-labels, filter chips. */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS[status].label;
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
