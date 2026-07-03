/**
 * The customer-facing create-order (booking) flow. A shareable deep-link to this
 * path drops the recipient straight into the pre-order gate + order form. Admins
 * and employees can send it into any chat; the customer opens it and lands ready
 * to fill in a new order (routed through login first if they're signed out).
 */
export const BOOK_PATH = "/customer/book";

/**
 * Absolute booking link for the current origin (client-side). Falls back to the
 * relative path during SSR, where `window` isn't available.
 */
export function buildBookLink(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${BOOK_PATH}`;
  }
  return BOOK_PATH;
}

// ----- Homepage query-param pre-fill -----

import type { TripType, CabinClass } from "@/lib/db/types";
import { AIRLINES } from "@/lib/orders/form";

/**
 * Trip fields the public homepage search widget can hand to /customer/book via
 * query params (?from=&to=&tripType=&depart=&return=&cabin=&adults=&children=
 * &airline=). Everything is optional and strictly validated — a malformed param
 * is simply dropped, never trusted.
 */
export type BookPrefill = {
  from?: string;
  to?: string;
  tripType?: TripType;
  depart?: string;
  return?: string;
  cabin?: CabinClass;
  adults?: number;
  children?: number;
  airline?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRIP_SET = new Set<string>(["direct", "connection"]);
const CABIN_SET = new Set<string>([
  "economy",
  "premium_economy",
  "business",
  "first",
]);
// The public homepage widget sends friendlier spellings — map them onto the
// canonical CabinClass values instead of silently dropping the param.
const CABIN_ALIASES: Record<string, string> = {
  premium: "premium_economy",
  "premium-economy": "premium_economy",
  premiumeconomy: "premium_economy",
};

function str(v: string | string[] | undefined, max = 80): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  const clean = raw?.trim().slice(0, max);
  return clean || undefined;
}

function int(
  v: string | string[] | undefined,
  min: number,
  max: number
): number | undefined {
  const raw = str(v, 3);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

/** Parse + sanitise homepage search params into Step 1 pre-fill values. */
export function parseBookPrefill(
  sp: Record<string, string | string[] | undefined>
): BookPrefill {
  const tripType = str(sp.tripType, 20);
  const cabinRaw = str(sp.cabin, 20)?.toLowerCase();
  const cabin = cabinRaw ? (CABIN_ALIASES[cabinRaw] ?? cabinRaw) : undefined;
  const depart = str(sp.depart, 10);
  const ret = str(sp.return, 10);
  const airline = str(sp.airline, 40);
  return {
    from: str(sp.from),
    to: str(sp.to),
    tripType:
      tripType && TRIP_SET.has(tripType) ? (tripType as TripType) : undefined,
    depart: depart && DATE_RE.test(depart) ? depart : undefined,
    return: ret && DATE_RE.test(ret) ? ret : undefined,
    cabin: cabin && CABIN_SET.has(cabin) ? (cabin as CabinClass) : undefined,
    adults: int(sp.adults, 1, 9),
    children: int(sp.children, 0, 8),
    airline: airline && (AIRLINES as readonly string[]).includes(airline) ? airline : undefined,
  };
}
