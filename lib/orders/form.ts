import type { TripType, CabinClass } from "@/lib/db/types";

/**
 * Shared shape for the create-order flow (Chunk 1). One reusable form
 * (components/orders/order-form.tsx) collects these for ALL THREE roles —
 * admin, employee and customer — and each role's server action persists them.
 *
 * Children logic: ages 18+ are NOT children. The form reconciles a child whose
 * age is 18+ into the adult count before submit (see reconcilePassengers), so
 * `childAges` here only ever holds ages 0–17 and its length === `children`.
 */
export type OrderFormInput = {
  passengerNames: string[];
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  tripType: TripType;
  cabinClass: CabinClass;
  adults: number;
  children: number;
  childAges: number[];
  wheelchair: boolean;
  extraLuggage: boolean;
  extraLuggageKg: number | null;
  customerNote: string | null;
};

export const TRIP_TYPES: { value: TripType; label: string; hint: string }[] = [
  { value: "direct", label: "Direct flight", hint: "Non-stop, one leg" },
  { value: "connection", label: "Connection flight", hint: "One or more stops" },
];

export const CABIN_CLASSES: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

/** The age at and above which a passenger counts as an adult, not a child. */
export const ADULT_AGE = 18;

const CABIN_LABEL = new Map(CABIN_CLASSES.map((c) => [c.value, c.label]));
const TRIP_LABEL = new Map(TRIP_TYPES.map((t) => [t.value, t.label]));

export function cabinLabel(value: CabinClass | null): string {
  return value ? (CABIN_LABEL.get(value) ?? value) : "—";
}

export function tripTypeLabel(value: TripType | null): string {
  return value ? (TRIP_LABEL.get(value) ?? value) : "—";
}

/**
 * The DB row shape an order INSERT writes (the columns added in migration 0016
 * plus the existing route/date fields). Shared by every role's create action so
 * the persisted record is identical no matter who placed the order.
 */
export type OrderInsertFields = {
  route_from: string;
  route_to: string;
  travel_date: string | null;
  return_date: string | null;
  trip_type: TripType;
  cabin_class: CabinClass;
  adults: number;
  children: number;
  child_ages: number[];
  wheelchair: boolean;
  extra_luggage: boolean;
  extra_luggage_kg: number | null;
  passenger_names: string[];
  passengers: number;
  customer_note: string | null;
  status: "new";
};

const TRIP_SET: TripType[] = ["direct", "connection"];
const CABIN_SET: CabinClass[] = ["economy", "premium_economy", "business", "first"];

/**
 * Validate + normalise raw form input into the DB row fields. Runs server-side
 * in every create action (the client validates too, but the server is the gate).
 * Trims/limits text, drops blank passenger names, and reconciles any 18+ child
 * age into the adult count so the stored counts are always consistent.
 */
export function normalizeOrderInput(
  input: OrderFormInput
): { ok: true; fields: OrderInsertFields } | { ok: false; error: string } {
  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Please tell us where you're flying from and to." };
  }

  const passengerNames = input.passengerNames
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (passengerNames.length === 0) {
    return { ok: false, error: "Add at least one passenger name." };
  }

  if (!input.travelDate) {
    return { ok: false, error: "A departure date is required." };
  }

  if (!TRIP_SET.includes(input.tripType)) {
    return { ok: false, error: "Choose a trip type (direct or connection)." };
  }
  if (!CABIN_SET.includes(input.cabinClass)) {
    return { ok: false, error: "Choose a cabin class." };
  }

  // Reconcile children: anyone 18+ is an adult, so fold them into the adult
  // count and keep only genuine (0–17) child ages.
  const childAgesRaw = input.childAges.filter((a) => Number.isFinite(a));
  const adultsFromChildren = childAgesRaw.filter((a) => a >= ADULT_AGE).length;
  const childAges = childAgesRaw.filter((a) => a >= 0 && a < ADULT_AGE);

  if (childAges.length !== childAgesRaw.length - adultsFromChildren) {
    return { ok: false, error: "Each child's age must be 0–17." };
  }

  const adults = Math.max(1, Math.floor(input.adults) + adultsFromChildren);
  const children = childAges.length;

  if (input.children > 0 && childAgesRaw.length < input.children) {
    return { ok: false, error: "Enter an age for each child." };
  }

  const extraLuggageKg =
    input.extraLuggage && input.extraLuggageKg != null && input.extraLuggageKg > 0
      ? Math.min(Math.round(input.extraLuggageKg), 200)
      : null;

  return {
    ok: true,
    fields: {
      route_from: routeFrom,
      route_to: routeTo,
      travel_date: input.travelDate,
      return_date: input.returnDate || null,
      trip_type: input.tripType,
      cabin_class: input.cabinClass,
      adults,
      children,
      child_ages: childAges,
      wheelchair: !!input.wheelchair,
      extra_luggage: !!input.extraLuggage,
      extra_luggage_kg: extraLuggageKg,
      passenger_names: passengerNames,
      passengers: adults + children,
      customer_note: input.customerNote?.trim() || null,
      status: "new",
    },
  };
}
