"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumn, isMissingTable, isUuid } from "@/lib/db/errors";
import { getMailStatus, sendMail, type MailStatus } from "@/lib/email";
import { sanitizeLine, sanitizeText } from "@/lib/security/limits";
import {
  DEFAULT_BIRTHDAY_MESSAGE,
  DEFAULT_BIRTHDAY_SUBJECT,
  isPlausibleDob,
  nextBirthday,
  renderBirthdayEmail,
  todayYMD,
  toISO,
  type BirthdayBrand,
} from "@/lib/birthdays";
import {
  BIRTHDAY_WINDOW_DAYS,
  EMAIL_SHAPE,
  RELATIONSHIPS,
  TRAVELLER_LIMITS as L,
  nameKey,
  normalizeEmail,
  sameName,
  type BirthdayStatus,
  type TravellerInput,
  type TravellerListItem,
  type TravellerSource,
  type TripRole,
  type TripSummary,
} from "@/lib/travellers";
import type { CabinClass, OrderStatus } from "@/lib/db/types";
import {
  Directory,
  planOrder,
  travellerFromCustomer,
  type CustomerRow,
  type OrderRow,
  type Plan,
  type TravellerRow,
} from "@/lib/travellers-import";

/**
 * Travel details — admin-only server actions.
 *
 * Every action re-checks that the caller is an admin, and every table behind
 * this screen is admin-only in RLS (migration 0025), so this is enforced twice.
 *
 * The directory fills itself: each visit reads any orders and customer
 * accounts it has not seen yet into traveller records (see `importBookings`).
 * The admin can also add, edit and remove people by hand.
 */

type Sb = Awaited<ReturnType<typeof createClient>>;
type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
  return { user, profile };
}

/** The message the screen shows until migration 0025 has been run. */
const SETUP_ERROR = "Run migration 0025_travel_details.sql in Supabase first.";

/** Saving an IBE number before migration 0026 has been run. */
const IBE_SETUP_ERROR =
  "To save IBE numbers, run migration 0026_traveller_ibe.sql in Supabase first. Clear the IBE field to save everything else now.";

/* ================================================================== rows */

type TripRow = {
  traveller_id: string;
  order_id: string;
  role: TripRole;
  ibe: string | null;
  order: Pick<
    OrderRow,
    "id" | "order_number" | "route_from" | "route_to" | "travel_date" | "status" | "created_at"
  > | null;
};

function todayISO() {
  return toISO(todayYMD());
}

/** Emails live on `profiles` for customers with a portal login. */
async function profileEmails(sb: Sb, profileIds: string[]) {
  const map = new Map<string, string | null>();
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await sb
      .from("profiles")
      .select("id, email")
      .in("id", ids.slice(i, i + 500))
      .returns<{ id: string; email: string | null }[]>();
    for (const p of data ?? []) map.set(p.id, p.email);
  }
  return map;
}

/* ============================================================== importer */

async function writePlan(sb: Sb, plan: Plan) {
  for (let i = 0; i < plan.inserts.length; i += 400) {
    const { error } = await sb.from("travellers").insert(plan.inserts.slice(i, i + 400));
    if (error) throw error;
  }
  const patches = [...plan.patches.entries()];
  for (let i = 0; i < patches.length; i += 8) {
    await Promise.all(
      patches.slice(i, i + 8).map(([id, patch]) =>
        sb.from("travellers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id)
      )
    );
  }
  const trips = [...plan.trips.values()];
  for (let i = 0; i < trips.length; i += 500) {
    const { error } = await sb
      .from("traveller_trips")
      .upsert(trips.slice(i, i + 500), { onConflict: "traveller_id,order_id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

async function markImported(sb: Sb, type: "order" | "customer", ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await sb
    .from("traveller_imports")
    .upsert(
      ids.map((id) => ({ source_type: type, source_id: id })),
      { onConflict: "source_type,source_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

/** Upper bound on one visit's work, so a first run over years of orders
 *  can't hold the page for long. The next visit carries on. */
const BATCH = 250;
const MAX_BATCHES = 6;

/**
 * Read every customer account and order not yet seen into the directory.
 *
 * Customers first, so an order's account holder already has a record by the
 * time the order is read. Each batch is written before it is marked imported:
 * a failure part-way leaves the batch unmarked, and the next run's matching
 * finds whatever did land instead of duplicating it.
 */
async function importBookings(sb: Sb, adminId: string): Promise<{ imported: number; more: boolean }> {
  const { data: existing, error } = await sb.from("travellers").select("*").returns<TravellerRow[]>();
  if (error) throw error;
  const dir = new Directory(existing ?? []);
  let imported = 0;
  let batches = 0;

  // ---- customer accounts
  for (;;) {
    if (batches++ >= MAX_BATCHES) return { imported, more: true };
    const { data: pending, error: pErr } = await sb
      .from("traveller_pending_customers")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(BATCH)
      .returns<{ id: string }[]>();
    if (pErr) throw pErr;
    const ids = (pending ?? []).map((p) => p.id);
    if (ids.length === 0) break;

    const { data: customers, error: cErr } = await sb
      .from("customers")
      .select("*")
      .in("id", ids)
      .returns<CustomerRow[]>();
    if (cErr) throw cErr;
    const emails = await profileEmails(sb, (customers ?? []).map((c) => c.profile_id ?? ""));

    const plan: Plan = { inserts: [], patches: new Map(), trips: new Map() };
    for (const c of customers ?? []) {
      if (dir.byCustomer.has(c.id)) continue;
      const row = travellerFromCustomer(c, c.profile_id ? (emails.get(c.profile_id) ?? null) : null, adminId);
      plan.inserts.push(row);
      dir.add(row);
    }
    await writePlan(sb, plan);
    await markImported(sb, "customer", ids);
    imported += plan.inserts.length;
    if (ids.length < BATCH) break;
  }

  // ---- orders, oldest first so the directory builds up in booking order
  const customerCache = new Map<string, CustomerRow | null>();
  for (;;) {
    if (batches++ >= MAX_BATCHES) return { imported, more: true };
    const { data: pending, error: pErr } = await sb
      .from("traveller_pending_orders")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(BATCH)
      .returns<{ id: string }[]>();
    if (pErr) throw pErr;
    const ids = (pending ?? []).map((p) => p.id);
    if (ids.length === 0) break;

    // `*` so a database without 0021/0024 still answers (no airline, no roster).
    const { data: orders, error: oErr } = await sb
      .from("orders")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: true })
      .returns<OrderRow[]>();
    if (oErr) throw oErr;

    const missing = Array.from(
      new Set((orders ?? []).map((o) => o.customer_id).filter((id): id is string => !!id && !customerCache.has(id)))
    );
    if (missing.length) {
      const { data: cs } = await sb.from("customers").select("*").in("id", missing).returns<CustomerRow[]>();
      for (const id of missing) customerCache.set(id, (cs ?? []).find((c) => c.id === id) ?? null);
    }

    const plan: Plan = { inserts: [], patches: new Map(), trips: new Map() };
    for (const o of orders ?? []) {
      planOrder(plan, dir, o, o.customer_id ? (customerCache.get(o.customer_id) ?? null) : null, adminId);
    }
    await writePlan(sb, plan);
    await markImported(sb, "order", ids);
    imported += plan.inserts.length;
    if (ids.length < BATCH) break;
  }

  return { imported, more: false };
}

/* ============================================================== overview */

export type TravelDetailsOverview = {
  /** Migration 0025 hasn't been run: the screen shows the setup notice. */
  setup: boolean;
  items: TravellerListItem[];
  /** People added from bookings on this visit. */
  imported: number;
  /** The import stopped at its per-visit cap; more arrive on the next visit. */
  importPending: boolean;
  /** The importer failed. The directory still shows what it already holds. */
  importError: string | null;
  mail: MailStatus;
  todayISO: string;
};

function emptyOverview(setup: boolean): TravelDetailsOverview {
  return {
    setup,
    items: [],
    imported: 0,
    importPending: false,
    importError: null,
    mail: getMailStatus(),
    todayISO: todayISO(),
  };
}

export async function getTravelDetailsOverview(): Promise<TravelDetailsOverview> {
  const { user } = await requireAdmin();
  const sb = await createClient();
  const today = todayYMD();
  const iso = toISO(today);

  // Is the migration there at all?
  const probe = await sb.from("travellers").select("id").limit(1);
  if (probe.error) {
    if (isMissingTable(probe.error)) return emptyOverview(true);
    throw probe.error;
  }

  let imported = 0;
  let importPending = false;
  let importError: string | null = null;
  try {
    ({ imported, more: importPending } = await importBookings(sb, user.id));
  } catch (e) {
    importError = e instanceof Error ? e.message : "The import from bookings failed.";
  }

  const [travellersRes, tripsRes, logsRes] = await Promise.all([
    sb.from("travellers").select("*").returns<TravellerRow[]>(),
    sb
      .from("traveller_trips")
      .select("traveller_id, order_id, role, ibe, order:orders(id, order_number, route_from, route_to, travel_date, status, created_at)")
      .returns<TripRow[]>(),
    sb
      .from("traveller_birthday_emails")
      .select("traveller_id, birthday_year, status, error, sent_at")
      .gte("birthday_year", today.y)
      .order("sent_at", { ascending: false })
      .returns<{ traveller_id: string | null; birthday_year: number; status: "sent" | "failed"; error: string | null; sent_at: string }[]>(),
  ]);
  if (travellersRes.error) throw travellersRes.error;
  if (tripsRes.error) throw tripsRes.error;
  const travellers = travellersRes.data ?? [];

  // Linked and booking customers, for names, sign-in emails and — for an
  // account holder — the date of birth on their own record, which wins.
  const customerIds = Array.from(
    new Set(travellers.flatMap((t) => [t.customer_id, t.booked_by_customer_id]).filter((id): id is string => !!id))
  );
  const customers = new Map<string, CustomerRow>();
  for (let i = 0; i < customerIds.length; i += 500) {
    const { data } = await sb.from("customers").select("*").in("id", customerIds.slice(i, i + 500)).returns<CustomerRow[]>();
    for (const c of data ?? []) customers.set(c.id, c);
  }
  const emails = await profileEmails(sb, [...customers.values()].map((c) => c.profile_id ?? ""));

  const tripsBy = new Map<string, TripRow[]>();
  for (const t of tripsRes.data ?? []) {
    if (!t.order) continue;
    tripsBy.set(t.traveller_id, [...(tripsBy.get(t.traveller_id) ?? []), t]);
  }

  const attempt = new Map<string, { status: "sent" | "failed"; error: string | null; sent_at: string }>();
  for (const l of logsRes.data ?? []) {
    if (!l.traveller_id) continue;
    const key = `${l.traveller_id}:${l.birthday_year}`;
    const seen = attempt.get(key);
    if (!seen || (l.status === "sent" && seen.status !== "sent")) attempt.set(key, l);
  }

  const items: TravellerListItem[] = travellers.map((t) => {
    const linked = t.customer_id ? customers.get(t.customer_id) : undefined;
    const booker = t.booked_by_customer_id ? customers.get(t.booked_by_customer_id) : undefined;
    const email = t.email || (linked?.profile_id ? (emails.get(linked.profile_id) ?? null) : null);
    const phone = t.phone || linked?.wa_phone || null;
    const dob = linked?.date_of_birth || t.date_of_birth;

    const trips = (tripsBy.get(t.id) ?? []).map(
      (r): TripSummary & { ibe: string | null; createdAt: string } => ({
        orderId: r.order!.id,
        orderNumber: r.order!.order_number,
        from: r.order!.route_from,
        to: r.order!.route_to,
        travelDate: r.order!.travel_date,
        status: r.order!.status,
        role: r.role,
        ibe: r.ibe,
        createdAt: r.order!.created_at,
      })
    );
    const live = trips.filter((x) => x.status !== "cancelled");
    // Only trips they are actually on: an account holder who booked for
    // others isn't "travelling today" when their family flies.
    const upcoming = live
      .filter((x) => x.role !== "booker" && x.travelDate && x.travelDate >= iso)
      .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!));
    // "Last trip" is the most recent booking by departure date that has
    // already gone — or, failing that, the most recently placed booking.
    const past = live
      .filter((x) => x.travelDate && x.travelDate < iso)
      .sort((a, b) => b.travelDate!.localeCompare(a.travelDate!));
    const latestPlaced = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const lastTrip = past[0] ?? latestPlaced ?? null;

    const next = nextBirthday(dob, today);
    let birthday: TravellerListItem["birthday"] = null;
    if (next) {
      const log = attempt.get(`${t.id}:${next.year}`);
      let status: BirthdayStatus = "ready";
      if (t.customer_id) status = "account";
      else if (log?.status === "sent") status = "sent";
      else if (t.marketing_opt_out) status = "opted_out";
      else if (!normalizeEmail(email)) status = "no_email";
      else if (log?.status === "failed") status = "failed";
      birthday = {
        ...next,
        status,
        sentAt: log?.status === "sent" ? log.sent_at : null,
        error: log?.status === "failed" ? log.error : null,
      };
    }

    const bookerName = booker ? booker.name?.trim() || "Unnamed customer" : null;
    const latestIbe = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((x) => x.ibe)?.ibe ?? null;
    const haystack = [
      t.ibe_number,
      t.full_name,
      t.preferred_name,
      email,
      phone,
      phone?.replace(/\D/g, ""),
      t.nationality,
      t.passport_number,
      t.relationship,
      bookerName,
      t.address,
      dob,
      ...trips.flatMap((x) => [x.orderNumber, x.orderNumber.replace(/^#/, ""), x.from, x.to, x.ibe, x.travelDate]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const strip = (x: (typeof trips)[number] | undefined | null): TripSummary | null =>
      x
        ? { orderId: x.orderId, orderNumber: x.orderNumber, from: x.from, to: x.to, travelDate: x.travelDate, status: x.status, role: x.role }
        : null;

    return {
      id: t.id,
      fullName: t.full_name,
      preferredName: t.preferred_name,
      email,
      phone,
      dateOfBirth: dob ?? null,
      nationality: t.nationality,
      passportExpiry: t.passport_expiry,
      ibeNumber: t.ibe_number || latestIbe,
      customerId: t.customer_id,
      bookedBy: booker ? { id: booker.id, name: bookerName! } : null,
      relationship: t.relationship,
      marketingOptOut: t.marketing_opt_out,
      source: t.source,
      createdAt: t.created_at,
      tripCount: trips.filter((x) => x.role !== "booker").length,
      lastTrip: strip(lastTrip),
      nextTrip: strip(upcoming[0]),
      birthday,
      haystack,
    };
  });

  return {
    setup: false,
    items,
    imported,
    importPending,
    importError,
    mail: getMailStatus(),
    todayISO: iso,
  };
}

/* ================================================================ detail */

export type TravellerTrip = {
  orderId: string;
  orderNumber: string;
  from: string | null;
  to: string | null;
  travelDate: string | null;
  returnDate: string | null;
  status: OrderStatus;
  cabinClass: CabinClass | null;
  airline: string | null;
  sellingPrice: number | null;
  role: TripRole;
  ibe: string | null;
  createdAt: string;
  /** Everyone else on this booking who is in the directory. */
  companions: { id: string; name: string }[];
};

export type TravellerDetail = {
  id: string;
  fullName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  address: string | null;
  /** The IBE number saved on their profile (migration 0026). */
  ibeNumber: string | null;
  /** When nothing is saved: the IBE on their latest booking, and which one. */
  bookingIbe: { ibe: string; orderNumber: string } | null;
  notes: string | null;
  relationship: string | null;
  marketingOptOut: boolean;
  source: TravellerSource;
  createdAt: string;
  updatedAt: string;
  /** Their own customer account, if they have one. */
  account: { id: string; name: string; hasLogin: boolean; conversationId: string | null } | null;
  /** The customer who books for them. */
  bookedBy: { id: string; name: string; conversationId: string | null } | null;
  trips: TravellerTrip[];
  /** People they have travelled with, most shared trips first. */
  travelsWith: { id: string; name: string; trips: number }[];
  /** Other people this traveller books for (they're the account holder). */
  booksFor: { id: string; name: string; relationship: string | null }[];
  birthday: TravellerListItem["birthday"];
  /** What the edit form starts from — the traveller's OWN stored values. */
  form: TravellerInput;
  todayISO: string;
  mail: MailStatus;
};

export async function getTravellerDetail(id: string): Promise<TravellerDetail | null> {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const sb = await createClient();
  const today = todayYMD();
  const iso = toISO(today);

  const { data: t, error } = await sb.from("travellers").select("*").eq("id", id).maybeSingle<TravellerRow>();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  if (!t) return null;

  const [tripsRes, logRes] = await Promise.all([
    sb
      .from("traveller_trips")
      .select("order_id, role, ibe")
      .eq("traveller_id", id)
      .returns<{ order_id: string; role: TripRole; ibe: string | null }[]>(),
    sb
      .from("traveller_birthday_emails")
      .select("birthday_year, status, error, sent_at")
      .eq("traveller_id", id)
      .gte("birthday_year", today.y)
      .order("sent_at", { ascending: false })
      .returns<{ birthday_year: number; status: "sent" | "failed"; error: string | null; sent_at: string }[]>(),
  ]);
  const tripLinks = tripsRes.data ?? [];
  const orderIds = tripLinks.map((r) => r.order_id);

  type SharedRow = {
    traveller_id: string;
    order_id: string;
    role: TripRole;
    traveller: { id: string; full_name: string } | null;
  };
  let orderRows: OrderRow[] = [];
  let shared: SharedRow[] = [];
  if (orderIds.length) {
    const [ordersRes, sharedRes] = await Promise.all([
      sb.from("orders").select("*").in("id", orderIds).returns<OrderRow[]>(),
      sb
        .from("traveller_trips")
        .select("traveller_id, order_id, role, traveller:travellers(id, full_name)")
        .in("order_id", orderIds)
        .neq("traveller_id", id)
        .returns<SharedRow[]>(),
    ]);
    orderRows = ordersRes.data ?? [];
    shared = sharedRes.data ?? [];
  }

  const customerIds = [t.customer_id, t.booked_by_customer_id].filter((x): x is string => !!x);
  const [customersRes, convsRes, booksForRes] = await Promise.all([
    customerIds.length
      ? sb.from("customers").select("*").in("id", customerIds).returns<CustomerRow[]>()
      : Promise.resolve({ data: [] as CustomerRow[] }),
    customerIds.length
      ? sb
          .from("conversations")
          .select("id, customer_id, last_message_at")
          .in("customer_id", customerIds)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .returns<{ id: string; customer_id: string; last_message_at: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; customer_id: string; last_message_at: string | null }[] }),
    t.customer_id
      ? sb
          .from("travellers")
          .select("id, full_name, relationship")
          .eq("booked_by_customer_id", t.customer_id)
          .neq("id", id)
          .order("full_name")
          .returns<{ id: string; full_name: string; relationship: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; full_name: string; relationship: string | null }[] }),
  ]);
  const customers = new Map((customersRes.data ?? []).map((c) => [c.id, c]));
  const convFor = (cid: string) => (convsRes.data ?? []).find((c) => c.customer_id === cid)?.id ?? null;
  const linked = t.customer_id ? customers.get(t.customer_id) : undefined;
  const booker = t.booked_by_customer_id ? customers.get(t.booked_by_customer_id) : undefined;
  const emails = await profileEmails(sb, linked?.profile_id ? [linked.profile_id] : []);

  const companionsBy = new Map<string, { id: string; name: string }[]>();
  const together = new Map<string, { id: string; name: string; trips: number }>();
  for (const s of shared) {
    if (!s.traveller || s.role === "booker") continue;
    const person = { id: s.traveller.id, name: s.traveller.full_name };
    companionsBy.set(s.order_id, [...(companionsBy.get(s.order_id) ?? []), person]);
  }
  const orders = new Map(orderRows.map((o) => [o.id, o]));
  const trips: TravellerTrip[] = tripLinks
    .map((link): TravellerTrip | null => {
      const o = orders.get(link.order_id);
      if (!o) return null;
      return {
        orderId: o.id,
        orderNumber: o.order_number,
        from: o.route_from,
        to: o.route_to,
        travelDate: o.travel_date,
        returnDate: o.return_date,
        status: o.status,
        cabinClass: o.cabin_class,
        airline: o.airline ?? null,
        sellingPrice: o.selling_price,
        role: link.role,
        ibe: link.ibe,
        createdAt: o.created_at,
        companions: companionsBy.get(o.id) ?? [],
      };
    })
    .filter((x): x is TravellerTrip => !!x)
    // Newest departure first; undated bookings by when they were placed.
    .sort((a, b) => (b.travelDate ?? b.createdAt).localeCompare(a.travelDate ?? a.createdAt));

  for (const trip of trips) {
    if (trip.role === "booker") continue;
    for (const c of trip.companions) {
      const cur = together.get(c.id) ?? { ...c, trips: 0 };
      cur.trips += 1;
      together.set(c.id, cur);
    }
  }

  const email = t.email || (linked?.profile_id ? (emails.get(linked.profile_id) ?? null) : null);
  const dob = linked?.date_of_birth || t.date_of_birth;
  const next = nextBirthday(dob, today);
  let birthday: TravellerListItem["birthday"] = null;
  if (next) {
    const logs = (logRes.data ?? []).filter((l) => l.birthday_year === next.year);
    const log = logs.find((l) => l.status === "sent") ?? logs[0];
    let status: BirthdayStatus = "ready";
    if (t.customer_id) status = "account";
    else if (log?.status === "sent") status = "sent";
    else if (t.marketing_opt_out) status = "opted_out";
    else if (!normalizeEmail(email)) status = "no_email";
    else if (log?.status === "failed") status = "failed";
    birthday = { ...next, status, sentAt: log?.status === "sent" ? log.sent_at : null, error: log?.status === "failed" ? log.error : null };
  }

  return {
    id: t.id,
    fullName: t.full_name,
    preferredName: t.preferred_name,
    email,
    phone: t.phone || linked?.wa_phone || null,
    dateOfBirth: dob ?? null,
    nationality: t.nationality,
    passportNumber: t.passport_number,
    passportExpiry: t.passport_expiry,
    address: t.address,
    ibeNumber: t.ibe_number || null,
    bookingIbe: (() => {
      const latest = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((x) => x.ibe);
      return latest ? { ibe: latest.ibe!, orderNumber: latest.orderNumber } : null;
    })(),
    notes: t.notes,
    relationship: t.relationship,
    marketingOptOut: t.marketing_opt_out,
    source: t.source,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    account: linked
      ? { id: linked.id, name: linked.name?.trim() || "Unnamed customer", hasLogin: !!linked.profile_id, conversationId: convFor(linked.id) }
      : null,
    bookedBy: booker
      ? { id: booker.id, name: booker.name?.trim() || "Unnamed customer", conversationId: convFor(booker.id) }
      : null,
    trips,
    travelsWith: [...together.values()].sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name)),
    booksFor: (booksForRes.data ?? []).map((b) => ({ id: b.id, name: b.full_name, relationship: b.relationship })),
    birthday,
    form: {
      id: t.id,
      fullName: t.full_name,
      preferredName: t.preferred_name ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      // For an account holder the form edits the date the Birthdays screen
      // reads, so it starts from that one.
      dateOfBirth: dob ?? "",
      nationality: t.nationality ?? "",
      passportNumber: t.passport_number ?? "",
      passportExpiry: t.passport_expiry ?? "",
      // The form's address is one line now (it sits beside the IBE number),
      // and a text input silently drops line breaks — so join them here.
      address: (t.address ?? "").trim().replace(/\s*[\r\n]+\s*/g, ", "),
      ibeNumber: t.ibe_number ?? "",
      bookedByCustomerId: t.booked_by_customer_id ?? "",
      relationship: t.relationship ?? "",
      marketingOptOut: t.marketing_opt_out,
      notes: t.notes ?? "",
    },
    todayISO: iso,
    mail: getMailStatus(),
  };
}

/* ================================================================ writes */

export type SaveTravellerResult =
  | { ok: true; id: string }
  | { ok: false; error: string; existingId?: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Create or update one traveller. Validation here is the real gate. */
export async function saveTraveller(input: TravellerInput): Promise<SaveTravellerResult> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Unauthorized" };

  const fullName = sanitizeLine(input.fullName, L.NAME);
  if (!fullName) return { ok: false, error: "Enter their full name, as it appears on their passport." };

  const rawEmail = sanitizeLine(input.email, L.EMAIL).toLowerCase();
  if (rawEmail && !EMAIL_SHAPE.test(rawEmail)) return { ok: false, error: "That email address doesn't look right." };

  const dob = input.dateOfBirth.trim();
  if (dob && !isPlausibleDob(dob)) return { ok: false, error: "Enter a real date of birth — in the past, and not over 120 years ago." };

  const expiry = input.passportExpiry.trim();
  if (expiry && !ISO_DATE.test(expiry)) return { ok: false, error: "Enter the passport expiry as a date." };

  const relationship = input.relationship.trim();
  if (relationship && !(RELATIONSHIPS as readonly string[]).includes(relationship)) {
    return { ok: false, error: "Choose a relationship from the list." };
  }

  const bookedBy = input.bookedByCustomerId.trim() || null;
  if (bookedBy && !isUuid(bookedBy)) return { ok: false, error: "Choose who books for them from the list." };

  const fields = {
    full_name: fullName,
    preferred_name: sanitizeLine(input.preferredName, L.NAME) || null,
    email: rawEmail || null,
    phone: sanitizeLine(input.phone, L.PHONE) || null,
    date_of_birth: dob || null,
    nationality: sanitizeLine(input.nationality, L.NATIONALITY) || null,
    passport_number: sanitizeLine(input.passportNumber, L.PASSPORT).toUpperCase() || null,
    passport_expiry: expiry || null,
    address: sanitizeText(input.address, L.ADDRESS).trim() || null,
    notes: sanitizeText(input.notes, L.NOTES).trim() || null,
    relationship: relationship || null,
    marketing_opt_out: !!input.marketingOptOut,
    updated_at: new Date().toISOString(),
  };
  const ibe = sanitizeLine(input.ibeNumber ?? "", L.IBE).toUpperCase() || null;

  const sb = await createClient();

  /**
   * Write with the IBE number, and if the database doesn't have that column
   * yet (migration 0026 not run): write everything else when no IBE was
   * typed — so nothing that worked before stops working — or explain the
   * one step needed when one was.
   */
  async function write<R extends { error: { code?: string; message: string } | null }>(
    run: (row: typeof fields & { ibe_number?: string | null }) => PromiseLike<R>
  ): Promise<R | { data: null; error: { message: string } }> {
    const first = await run({ ...fields, ibe_number: ibe });
    if (!first.error || !isMissingColumn(first.error)) return first;
    if (ibe) return { data: null, error: { message: IBE_SETUP_ERROR } };
    return run(fields);
  }

  // ---------------------------------------------------------------- edit
  if (input.id) {
    if (!isUuid(input.id)) return { ok: false, error: "Unknown traveller." };
    const { data: current, error: readErr } = await sb
      .from("travellers")
      .select("id, customer_id")
      .eq("id", input.id)
      .maybeSingle<{ id: string; customer_id: string | null }>();
    if (readErr) return { ok: false, error: isMissingTable(readErr) ? SETUP_ERROR : readErr.message };
    if (!current) return { ok: false, error: "That traveller no longer exists." };

    const id = input.id;
    const { error } = await write((row) =>
      sb
        .from("travellers")
        .update({
          ...row,
          // An account holder books for others; they are nobody's companion.
          booked_by_customer_id: current.customer_id ? null : bookedBy,
        })
        .eq("id", id)
    );
    if (error) return { ok: false, error: error.message };

    // An account holder's birthday lives on their customer record — that is
    // what the Birthdays screen and their own profile read — so keep it in
    // step rather than let the two drift apart.
    if (current.customer_id) {
      const { error: dobErr } = await sb
        .from("customers")
        .update({ date_of_birth: fields.date_of_birth })
        .eq("id", current.customer_id);
      if (dobErr && !isMissingColumn(dobErr)) {
        return { ok: false, error: `Saved, but their customer record's birthday couldn't be updated: ${dobErr.message}` };
      }
    }
    return { ok: true, id: input.id };
  }

  // -------------------------------------------------------------- create
  // Refuse an obvious duplicate: the same person already in the directory.
  const { data: sameNamed, error: dupErr } = await sb
    .from("travellers")
    .select("id, full_name, email, date_of_birth")
    .ilike("full_name", `%${nameKey(fullName).split(" ").pop()?.replace(/[%_]/g, "") ?? ""}%`)
    .limit(200)
    .returns<{ id: string; full_name: string; email: string | null; date_of_birth: string | null }[]>();
  if (dupErr) return { ok: false, error: isMissingTable(dupErr) ? SETUP_ERROR : dupErr.message };
  const dup = (sameNamed ?? []).find(
    (r) =>
      sameName(r.full_name, fullName) &&
      ((!!dob && r.date_of_birth === dob) || (!!rawEmail && normalizeEmail(r.email) === rawEmail))
  );
  if (dup) {
    return {
      ok: false,
      error: `${dup.full_name} is already saved with the same ${dob && dup.date_of_birth === dob ? "date of birth" : "email"}.`,
      existingId: dup.id,
    };
  }

  const { data, error } = await write((row) =>
    sb
      .from("travellers")
      .insert({ ...row, booked_by_customer_id: bookedBy, source: "manual", created_by: auth.user.id })
      .select("id")
      .single<{ id: string }>()
  );
  if (error || !data) return { ok: false, error: error ? (isMissingTable(error) ? SETUP_ERROR : error.message) : "Couldn't save." };
  return { ok: true, id: data.id };
}

/**
 * Remove a traveller from the directory. Only the directory entry goes: their
 * orders, and any customer account they have, are untouched — and because
 * their bookings are already marked imported, they won't reappear.
 */
export async function deleteTraveller(id: string): Promise<ActionResult> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "Unknown traveller." };
  const sb = await createClient();
  const { error } = await sb.from("travellers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ======================================================= birthday wishes */

export type TravellerSendOutcome = {
  sent: { name: string; previewUrl: string | null }[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; error: string }[];
};

const MAX_PER_SEND = 200;

/**
 * Birthday wishes to travellers without a customer account, using the same
 * saved message and the same email design as the Birthdays screen — so a
 * companion's wish looks exactly like an account holder's.
 *
 * Recipients are resolved here from traveller ids; the browser never supplies
 * an address, so this can't be turned into a way to mail arbitrary people.
 */
export async function sendTravellerBirthdayWishes(input: {
  travellerIds: string[];
}): Promise<{ ok: true; data: TravellerSendOutcome } | { ok: false; error: string }> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Unauthorized" };

  const ids = Array.from(new Set(input.travellerIds)).filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Choose at least one traveller." };
  if (ids.length > MAX_PER_SEND) return { ok: false, error: `Send to at most ${MAX_PER_SEND} people at a time.` };
  if (getMailStatus().mode === "off") {
    return { ok: false, error: "Email isn't set up yet — add the SMTP settings to the server." };
  }

  const sb = await createClient();
  const today = todayYMD();
  const [settingsRes, travellersRes] = await Promise.all([
    sb.from("business_settings").select("*").eq("id", 1).maybeSingle<Record<string, string | null>>(),
    sb.from("travellers").select("*").in("id", ids).returns<TravellerRow[]>(),
  ]);
  if (travellersRes.error) {
    return { ok: false, error: isMissingTable(travellersRes.error) ? SETUP_ERROR : travellersRes.error.message };
  }
  const s = settingsRes.data;
  const brand: BirthdayBrand = {
    businessName: s?.business_name?.trim() || "Wicket Travel",
    logoUrl: s?.logo_url ?? null,
    businessEmail: s?.business_email ?? null,
    businessPhone: s?.business_phone ?? null,
    businessAddress: s?.business_address ?? null,
  };
  const subject = s?.birthday_subject?.trim() || DEFAULT_BIRTHDAY_SUBJECT;
  const message = s?.birthday_message?.trim() || DEFAULT_BIRTHDAY_MESSAGE;

  const outcome: TravellerSendOutcome = { sent: [], skipped: [], failed: [] };
  const travellers = travellersRes.data ?? [];

  const jobs = travellers.map((t) => async () => {
    const name = t.full_name;
    const email = normalizeEmail(t.email);
    const next = nextBirthday(t.date_of_birth, today);
    if (t.customer_id) return void outcome.skipped.push({ name, reason: "Has a customer account — send from Birthdays" });
    if (!next) return void outcome.skipped.push({ name, reason: "No birthday on file" });
    if (next.daysUntil > BIRTHDAY_WINDOW_DAYS) return void outcome.skipped.push({ name, reason: "Birthday isn't coming up" });
    if (t.marketing_opt_out) return void outcome.skipped.push({ name, reason: "Opted out of marketing emails" });
    if (!email) return void outcome.skipped.push({ name, reason: "No email address" });

    // Claim before sending: the partial unique index turns a double click, or
    // two admins at once, into one email.
    const { data: claim, error: claimErr } = await sb
      .from("traveller_birthday_emails")
      .insert({ traveller_id: t.id, email, traveller_name: name, birthday_year: next.year, status: "sent", sent_by: auth.user.id })
      .select("id")
      .single<{ id: string }>();
    if (claimErr || !claim) {
      if (claimErr?.code === "23505") return void outcome.skipped.push({ name, reason: "Already wished this year" });
      return void outcome.failed.push({ name, error: claimErr?.message ?? "Couldn't log the send." });
    }

    const rendered = forTraveller(renderBirthdayEmail({ subject, message, recipient: { fullName: name }, brand }), brand.businessName);
    const res = await sendMail({ to: email, ...rendered, replyTo: brand.businessEmail });
    if (res.ok) {
      outcome.sent.push({ name, previewUrl: res.previewUrl });
    } else {
      await sb.from("traveller_birthday_emails").update({ status: "failed", error: res.error.slice(0, 500) }).eq("id", claim.id);
      outcome.failed.push({ name, error: res.error });
    }
  });

  // A few at a time: mailbox providers throttle bursts from one sender.
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await job();
    })
  );
  for (const id of ids) {
    if (!travellers.some((t) => t.id === id)) outcome.skipped.push({ name: "Unknown traveller", reason: "No longer in Travel details" });
  }
  return { ok: true, data: outcome };
}

/**
 * The shared birthday email says "because you have an account with …", which
 * is untrue for someone who only travelled on another person's booking. Swap
 * that one sentence — and give them a way to say no — without touching the
 * shared template the Birthdays screen relies on.
 */
function forTraveller<T extends { html: string; text: string }>(email: T, businessName: string): T {
  const esc = businessName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const sentence = (n: string) => `You are receiving this because you have an account with ${n}.`;
  const replacement = (n: string) =>
    `You are receiving this because you have travelled with ${n}. Reply to this email if you would rather not hear from us.`;
  return {
    ...email,
    html: email.html.replace(sentence(esc), replacement(esc)),
    text: email.text.replace(sentence(businessName), replacement(businessName)),
  };
}
