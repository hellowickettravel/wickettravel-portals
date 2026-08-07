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
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(d)
      // en-GB abbreviates September as "Sept"; the design writes every month
      // as three letters, so every short date lines up in a table column.
      .replace("Sept", "Sep")
  );
}

/**
 * "12 August 2026" — the design's long date without the weekday. Used by the
 * order screen's flight tiles and the order thread's day dividers, where
 * `fmtLongDate` would wrap the tile onto a second line.
 */
export function fmtFullDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * The long, spoken form the Admin design uses in its dashboard standfirst —
 * "Tuesday 4 August 2026".
 */
export function fmtLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // en-GB puts a comma after the weekday; the design writes it without one.
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(d)
    .replace(",", "");
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
 * "London Heathrow (LHR)" → "LHR". The design writes routes as IATA codes so a
 * pipeline row fits its column; the full place name still shows on the record.
 * Falls back to the trimmed value when there is no code to pull out.
 */
export function placeCode(value: string | null | undefined): string {
  if (!value) return "—";
  const m = value.match(/\(([A-Za-z]{3})\)\s*$/);
  if (m) return m[1].toUpperCase();
  const bare = value.trim();
  return /^[A-Za-z]{3}$/.test(bare) ? bare.toUpperCase() : bare;
}

/** "LHR → DXB", the design's route cell. */
export function routeLabel(
  from: string | null | undefined,
  to: string | null | undefined
): string {
  return `${placeCode(from)} → ${placeCode(to)}`;
}

/**
 * A lifecycle status as the design writes it: sentence case, not title case —
 * "In progress", never "In Progress". Every status pill in /admin reads this.
 */
export function statusLabel(value: string): string {
  const s = value.replace(/_/g, " ").trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Capitalize the first letter of each word (for lowercase enum display). */
export function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
