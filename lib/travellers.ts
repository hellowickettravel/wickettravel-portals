/**
 * Travel details — the admin's directory of everyone the business has booked
 * travel for. Shared, client-safe pieces: the shapes the screens render, the
 * field rules, and the name matching that decides whether two passenger-list
 * entries are the same person.
 *
 * Pure and dependency-free on purpose, so the server's importer and anything
 * the browser shows agree on exactly the same rules.
 */

import type { OrderStatus } from "@/lib/db/types";

/* ---------------------------------------------------------------- limits */

export const TRAVELLER_LIMITS = {
  NAME: 120,
  EMAIL: 254,
  PHONE: 40,
  NATIONALITY: 60,
  PASSPORT: 30,
  ADDRESS: 400,
  IBE: 40,
  RELATIONSHIP: 60,
  NOTES: 4000,
} as const;

/** How far ahead "Birthdays coming up" looks, and how early a wish may go. */
export const BIRTHDAY_WINDOW_DAYS = 30;

/** A passport inside this many months of expiry is flagged. Most countries
 *  ask for six months' validity on arrival, so that is the useful warning. */
export const PASSPORT_WARN_MONTHS = 6;

export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The relationship choices on the form. A select rather than free text so the
 * directory can be read at a glance and filtered later; "Other" plus the notes
 * field covers anything unusual.
 */
export const RELATIONSHIPS = [
  "Spouse or partner",
  "Parent",
  "Child",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Other relative",
  "Friend",
  "Colleague",
  "Other",
] as const;

/* ----------------------------------------------------------------- types */

export type TravellerSource = "manual" | "customer" | "order";

/** lead = account holder, travelling · companion = travelling with them ·
 *  booker = account holder who booked but is not on the passenger list. */
export type TripRole = "lead" | "companion" | "booker";

export const ROLE_LABEL: Record<TripRole, string> = {
  lead: "Travelling · lead",
  companion: "Travelling",
  booker: "Booked for others",
};

export const SOURCE_LABEL: Record<TravellerSource, string> = {
  manual: "Added by hand",
  customer: "From a customer account",
  order: "From a booking",
};

export type TripSummary = {
  orderId: string;
  orderNumber: string;
  from: string | null;
  to: string | null;
  travelDate: string | null;
  status: OrderStatus;
  role: TripRole;
};

export type BirthdayStatus =
  | "ready"
  | "sent"
  | "failed"
  | "no_email"
  | "opted_out"
  /** Has a customer account — wished from the Birthdays screen instead. */
  | "account";

export type TravellerListItem = {
  id: string;
  fullName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  /** Effective date of birth (a linked account's own record wins). */
  dateOfBirth: string | null;
  nationality: string | null;
  passportExpiry: string | null;
  /** Their saved IBE number, or failing that the one on their latest booking. */
  ibeNumber: string | null;
  customerId: string | null;
  bookedBy: { id: string; name: string } | null;
  relationship: string | null;
  marketingOptOut: boolean;
  source: TravellerSource;
  createdAt: string;
  tripCount: number;
  lastTrip: TripSummary | null;
  nextTrip: TripSummary | null;
  birthday: {
    date: string;
    daysUntil: number;
    turning: number | null;
    year: number;
    status: BirthdayStatus;
    sentAt: string | null;
    error: string | null;
  } | null;
  /** Lower-cased text the search box matches against: the person's own
   *  details plus every order number, route and IBE they have travelled on. */
  haystack: string;
};

/** What the add / edit form edits. Dates are "YYYY-MM-DD" or "". */
export type TravellerInput = {
  id?: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  address: string;
  ibeNumber: string;
  bookedByCustomerId: string;
  relationship: string;
  marketingOptOut: boolean;
  notes: string;
};

export const EMPTY_TRAVELLER: TravellerInput = {
  fullName: "",
  preferredName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
  address: "",
  ibeNumber: "",
  bookedByCustomerId: "",
  relationship: "",
  marketingOptOut: false,
  notes: "",
};

/* ----------------------------------------------------------- name matching */

/** Honorifics a passenger list sometimes carries and a passport never does. */
const TITLES = new Set([
  "mr", "mrs", "ms", "miss", "mstr", "master", "dr", "prof", "sir", "madam", "mx",
]);

/**
 * "Mrs.  Zoë  O'Brien-Khan" → "zoe obrienkhan". Lower-cased, accents folded,
 * punctuation dropped, titles removed, spaces collapsed.
 */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t && !TITLES.has(t))
    .join(" ");
}

/**
 * The key two names share when they are plausibly the same person: first and
 * last word only, so "Ali Raza Khan" and "Ali Khan" meet, while "Ali Khan" and
 * "Sara Khan" do not. Empty for a name with nothing usable in it.
 */
export function nameKey(name: string | null | undefined): string {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = nameKey(a);
  return !!ka && ka === nameKey(b);
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return EMAIL_SHAPE.test(e) ? e : null;
}

/* ------------------------------------------------------------------ dates */

/** "2031-02-14" → whole months from `todayISO` until then (negative = past). */
function monthsUntil(iso: string, todayISO: string): number {
  const [y1, m1, d1] = todayISO.split("-").map(Number);
  const [y2, m2, d2] = iso.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export type PassportState = "expired" | "soon" | "ok";

export function passportState(expiry: string | null | undefined, todayISO: string): PassportState | null {
  if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return null;
  if (expiry < todayISO) return "expired";
  return monthsUntil(expiry, todayISO) < PASSPORT_WARN_MONTHS ? "soon" : "ok";
}

/** "2026-09-30" + 2 → "2026-10-02". Calendar arithmetic in UTC, so no
 *  daylight-saving change can land it on the wrong day. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "This week" on Travel details: today and the six days after it. */
export const TRAVEL_WEEK_DAYS = 7;

export type TravelWindow = "today" | "tomorrow" | "week";

/**
 * Is this departure date inside the window? `todayISO` is the business's own
 * today (see `todayYMD`), so "today" means today in the UK, not wherever the
 * admin's laptop thinks it is.
 */
export function departsIn(travelDate: string | null | undefined, todayISO: string, w: TravelWindow): boolean {
  if (!travelDate) return false;
  if (w === "today") return travelDate === todayISO;
  if (w === "tomorrow") return travelDate === addDaysISO(todayISO, 1);
  return travelDate >= todayISO && travelDate <= addDaysISO(todayISO, TRAVEL_WEEK_DAYS - 1);
}

/** Age in whole years on `todayISO`, or null for a missing / odd date. */
export function ageOn(dob: string | null | undefined, todayISO: string): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = todayISO.split("-").map(Number);
  const age = y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0);
  return age >= 0 && age < 120 ? age : null;
}

/** "Parent of Ali Khan", "Travels with Ali Khan", or null. */
export function relationLine(
  relationship: string | null | undefined,
  bookedByName: string | null | undefined
): string | null {
  if (!bookedByName) return relationship || null;
  if (!relationship) return `Books through ${bookedByName}`;
  if (relationship === "Other" || relationship === "Friend" || relationship === "Colleague") {
    return `${relationship} · books through ${bookedByName}`;
  }
  return `${relationship} of ${bookedByName}`;
}
