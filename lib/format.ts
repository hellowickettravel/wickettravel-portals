/** Format a number as GBP currency (no decimals for whole amounts). */
export function gbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a plain integer with thousands separators. */
export function num(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** Format an ISO date string as e.g. "24 Jun 2026". Returns "—" when empty. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Compact relative-ish time for activity/last-seen, e.g. "2h ago", "Yesterday". */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

/**
 * Pull the airport code out of a route field for the fare stub.
 *
 * The order form captures free text — "London (LHR)" is what we ask for, but
 * "LHR", "London Heathrow" and "london" all arrive too. A parenthesised
 * three-letter code wins; failing that a short entry is already a code; and
 * anything longer is returned as-is, because guessing a code from a city name
 * would put a fact on screen that nobody entered.
 */
export function routeCode(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  const parenthesised = trimmed.match(/\(([A-Za-z]{3})\)/);
  if (parenthesised) return parenthesised[1].toUpperCase();
  if (trimmed.length <= 4) return trimmed.toUpperCase();
  return trimmed;
}

/** "London (LHR) → Dubai (DXB)", or an em dash when neither end is set. */
export function routeLabel(
  from: string | null | undefined,
  to: string | null | undefined
): string {
  if (!from && !to) return "—";
  return `${from ?? "—"} → ${to ?? "—"}`;
}

/** Capitalize the first letter of each word (for lowercase enum display). */
export function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
