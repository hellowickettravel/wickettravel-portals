/**
 * Travel details — the importer's pure half: given the directory as it
 * stands and one booking, decide who on that booking is already saved, who is
 * new, and which trips to link. No database access here, so the matching rules
 * can be exercised directly; `lib/actions/travellers.ts` does the reading and
 * writing around it.
 */

import { randomUUID } from "node:crypto";
import { isPlausibleDob } from "@/lib/birthdays";
import { sanitizeLine, sanitizeText } from "@/lib/security/limits";
import {
  TRAVELLER_LIMITS as L,
  nameKey,
  normalizeEmail,
  sameName,
  type TravellerSource,
  type TripRole,
} from "@/lib/travellers";
import type { CabinClass, OrderPassenger, OrderStatus } from "@/lib/db/types";

export type TravellerRow = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  address: string | null;
  notes: string | null;
  customer_id: string | null;
  booked_by_customer_id: string | null;
  relationship: string | null;
  marketing_opt_out: boolean;
  source: TravellerSource;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerRow = {
  id: string;
  name: string | null;
  wa_phone: string | null;
  profile_id: string | null;
  created_at: string;
  // All 0022 — absent on a database without it, which `select("*")` tolerates.
  preferred_name?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  route_from: string | null;
  route_to: string | null;
  travel_date: string | null;
  return_date: string | null;
  status: OrderStatus;
  cabin_class: CabinClass | null;
  airline?: string | null;
  selling_price: number | null;
  passenger_names: string[] | null;
  passenger_details?: OrderPassenger[] | null;
  created_at: string;
};


/**
 * The in-memory view of the directory the importer matches against. Rows the
 * importer creates are added as it goes, so the second order in a batch sees
 * the traveller the first one created.
 */
export class Directory {
  byId = new Map<string, TravellerRow>();
  byCustomer = new Map<string, TravellerRow>();
  byName = new Map<string, TravellerRow[]>();

  constructor(rows: TravellerRow[]) {
    for (const r of rows) this.add(r);
  }

  add(r: TravellerRow) {
    this.byId.set(r.id, r);
    if (r.customer_id) this.byCustomer.set(r.customer_id, r);
    const k = nameKey(r.full_name);
    if (k) this.byName.set(k, [...(this.byName.get(k) ?? []), r]);
  }

  /**
   * Is this passenger someone already in the directory?
   *
   * Same name is never enough on its own — "Ali Khan" is a lot of people. A
   * name must be backed by one more thing: the same date of birth, the same
   * email, or the same booker (the family that books together). A differing
   * date of birth rules a match out, whatever else agrees.
   *
   * Email alone is NOT enough either: families routinely put one parent's
   * address against every child on the booking.
   */
  findPassenger(p: { name: string; email: string | null; dob: string | null }, bookerId: string | null) {
    const candidates = this.byName.get(nameKey(p.name)) ?? [];
    let best: TravellerRow | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      if (p.dob && c.date_of_birth && p.dob !== c.date_of_birth) continue;
      let score = 0;
      if (p.dob && c.date_of_birth === p.dob) score += 4;
      if (p.email && normalizeEmail(c.email) === p.email) score += 3;
      if (bookerId && (c.booked_by_customer_id === bookerId || c.customer_id === bookerId)) score += 2;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    return best;
  }
}

export type Plan = {
  inserts: TravellerRow[];
  patches: Map<string, Partial<TravellerRow>>;
  trips: Map<string, { traveller_id: string; order_id: string; role: TripRole; ibe: string | null }>;
};

export function newRow(fields: Partial<TravellerRow> & { full_name: string; source: TravellerSource }, adminId: string): TravellerRow {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    preferred_name: null,
    email: null,
    phone: null,
    date_of_birth: null,
    nationality: null,
    passport_number: null,
    passport_expiry: null,
    address: null,
    notes: null,
    customer_id: null,
    booked_by_customer_id: null,
    relationship: null,
    marketing_opt_out: false,
    created_by: adminId,
    created_at: now,
    updated_at: now,
    ...fields,
  };
}

/** Fill only what is empty. The importer never overwrites what the admin typed. */
export function fillBlanks(plan: Plan, dir: Directory, row: TravellerRow, from: Partial<TravellerRow>) {
  const patch: Partial<TravellerRow> = {};
  for (const [k, v] of Object.entries(from) as [keyof TravellerRow, unknown][]) {
    if (v == null || v === "") continue;
    if (row[k] == null || row[k] === "") (patch as Record<string, unknown>)[k] = v;
  }
  if (Object.keys(patch).length === 0) return;
  Object.assign(row, patch);
  // A row created in this same run is still an insert — just update it in place.
  // (Indexes key on name and customer, which the importer never patches, so
  // the in-memory directory needs no re-indexing.)
  if (plan.inserts.includes(row)) return;
  plan.patches.set(row.id, { ...(plan.patches.get(row.id) ?? {}), ...patch });
}

export function travellerFromCustomer(c: CustomerRow, email: string | null, adminId: string) {
  return newRow(
    {
      full_name: sanitizeLine(c.name, L.NAME) || "Unnamed customer",
      preferred_name: sanitizeLine(c.preferred_name, L.NAME) || null,
      email: normalizeEmail(email),
      phone: sanitizeLine(c.wa_phone, L.PHONE) || null,
      date_of_birth: c.date_of_birth ?? null,
      nationality: sanitizeLine(c.nationality, L.NATIONALITY) || null,
      address: sanitizeText(c.address ?? "", L.ADDRESS).trim() || null,
      customer_id: c.id,
      source: "customer",
    },
    adminId
  );
}

/** Everyone on an order: the wizard's detailed roster first, then any plain
 *  names it did not already cover (the customer and employee forms only
 *  collect names). */
export function passengersOf(o: OrderRow) {
  const out: { name: string; email: string | null; dob: string | null; ibe: string | null; detailed: boolean }[] = [];
  const details = Array.isArray(o.passenger_details) ? o.passenger_details : [];
  for (const d of details) {
    const name = sanitizeLine(d?.name, L.NAME);
    if (!name) continue;
    out.push({
      name,
      email: normalizeEmail(d?.email),
      dob: d?.dob && isPlausibleDob(d.dob) ? d.dob : null,
      ibe: sanitizeLine(d?.ibe, 40) || null,
      detailed: true,
    });
  }
  for (const raw of o.passenger_names ?? []) {
    const name = sanitizeLine(raw, L.NAME);
    if (name && !out.some((p) => sameName(p.name, name))) {
      out.push({ name, email: null, dob: null, ibe: null, detailed: false });
    }
  }
  return out;
}

export function planOrder(plan: Plan, dir: Directory, o: OrderRow, holderCustomer: CustomerRow | null, adminId: string) {
  const holder = o.customer_id ? (dir.byCustomer.get(o.customer_id) ?? null) : null;
  const people = passengersOf(o);
  const hasDetails = people.some((p) => p.detailed);
  let holderTravels = false;

  const link = (travellerId: string, role: TripRole, ibe: string | null) => {
    const key = `${travellerId}:${o.id}`;
    const seen = plan.trips.get(key);
    // "lead" outranks "booker" if a person turns up twice on one order.
    if (!seen || (seen.role === "booker" && role !== "booker")) {
      plan.trips.set(key, { traveller_id: travellerId, order_id: o.id, role, ibe: ibe ?? seen?.ibe ?? null });
    }
  };

  people.forEach((p, i) => {
    // The admin wizard's first detailed row is, by contract, the customer the
    // order is filed against. A plain name list gives no such promise, so
    // there the holder is recognised by name.
    const isHolder =
      !!holderCustomer &&
      ((hasDetails && i === 0 && p.detailed) || sameName(p.name, holderCustomer.name));

    if (isHolder && holder) {
      holderTravels = true;
      fillBlanks(plan, dir, holder, { email: p.email, date_of_birth: p.dob });
      link(holder.id, "lead", p.ibe);
      return;
    }
    if (isHolder && !holder) {
      // The account holder's own traveller was deleted by the admin: respect
      // that, and don't resurrect them as a "companion" of themselves.
      return;
    }

    const found = dir.findPassenger(p, o.customer_id);
    if (found) {
      fillBlanks(plan, dir, found, {
        email: p.email,
        date_of_birth: p.dob,
        booked_by_customer_id: found.customer_id ? null : o.customer_id,
      });
      link(found.id, found.customer_id === o.customer_id ? "lead" : "companion", p.ibe);
      return;
    }
    const row = newRow(
      {
        full_name: p.name,
        email: p.email,
        date_of_birth: p.dob,
        booked_by_customer_id: o.customer_id,
        source: "order",
      },
      adminId
    );
    plan.inserts.push(row);
    dir.add(row);
    link(row.id, "companion", p.ibe);
  });

  // Booked, but not on the passenger list — a customer booking their parents'
  // flight. Their history should still show the booking.
  if (holder && !holderTravels) link(holder.id, "booker", null);
}
