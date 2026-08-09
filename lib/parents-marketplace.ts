/**
 * Shared types, constants and pure logic for the Parents Tickets MARKETPLACE
 * (tables: parent_ticket_identities, parent_ticket_listings,
 * parent_ticket_matches, parent_ticket_payments — see
 * APPLY_PARENTS_FULLSCOPE_0.sql at the repo root).
 *
 * Client-safe: no server imports, no database access, no side effects. Every
 * status union and label below mirrors a CHECK constraint in that file
 * one-for-one — if you change one, change the other.
 *
 * ── How this relates to lib/parents-tickets.ts ──────────────────────────────
 * That file is the BASIC lead-capture feature: a short public form landing in
 * an admin queue (parent_ticket_enquiries). It is live and untouched.
 *
 * This file is the marketplace built on top: verified people, full listings,
 * an approval workflow, matching, contact release and manual payments. The two
 * are deliberately separate tables — a lead is an anonymous enquiry, a listing
 * belongs to a logged-in account.
 *
 * ⚠ NOTHING IN THE PORTAL IMPORTS THIS YET. APPLY_PARENTS_FULLSCOPE_0.sql must
 * be run in the Supabase SQL editor before any screen can read or write these
 * tables — the schema is not applied automatically from here.
 */

// ============================================================================
// Identity verification (full scope item 1)
// ============================================================================

export type VerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected";

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "unverified",
  "pending_review",
  "verified",
  "rejected",
];

/** Sentence case, per the design system's status-label rule. */
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: "Not started",
  pending_review: "Awaiting review",
  verified: "Verified",
  rejected: "Rejected",
};

export type IdDocumentType =
  | "passport"
  | "driving_licence"
  | "national_id"
  | "residence_permit";

export const ID_DOCUMENT_TYPES: IdDocumentType[] = [
  "passport",
  "driving_licence",
  "national_id",
  "residence_permit",
];

export const ID_DOCUMENT_TYPE_LABELS: Record<IdDocumentType, string> = {
  passport: "Passport",
  driving_licence: "Driving licence",
  national_id: "National ID card",
  residence_permit: "Residence permit",
};

/** The private Storage bucket ID documents live in. Never public. */
export const ID_DOCUMENT_BUCKET = "parent-ticket-ids";

export type ParentTicketIdentity = {
  profile_id: string;
  legal_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  id_document_type: IdDocumentType | null;
  id_document_path: string | null;
  id_document_uploaded_at: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  /** Reserved for the future SMS/OTP phase. Nothing sets this yet. */
  phone_verified: boolean;
  phone_verified_at: string | null;
  verification_status: VerificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// Listings (full scope items 2 + 5)
// ============================================================================

/** Which side of the board. Same vocabulary as the basic feature. */
export type ListingKind = "traveller" | "requester";

export const LISTING_KINDS: ListingKind[] = ["traveller", "requester"];

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  traveller: "Offering help",
  requester: "Needs help",
};

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "matched"
  | "withdrawn"
  | "expired";

export const LISTING_STATUSES: ListingStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "matched",
  "withdrawn",
  "expired",
];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  matched: "Matched",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

/**
 * The statuses an OWNER may move a listing to themselves. Anything else is
 * admin-only and the database's guard trigger silently restores the old value
 * — so the UI should simply not offer it. Keep in step with
 * tg_guard_parent_ticket_listing().
 */
export const OWNER_SETTABLE_STATUSES: ListingStatus[] = [
  "draft",
  "pending_review",
  "withdrawn",
];

/** A listing is only matchable, and only publicly listable, in these states. */
export const PUBLISHABLE_STATUSES: ListingStatus[] = ["approved", "matched"];

/**
 * The assistance vocabulary, shared by both sides so matching can intersect
 * them directly. Deliberately practical and NON-MEDICAL — the product does not
 * collect health information.
 */
export type AssistanceKind =
  | "airport_navigation"
  | "check_in"
  | "security_help"
  | "boarding"
  | "language_help"
  | "baggage"
  | "wheelchair_push"
  | "medication_reminder"
  | "meet_and_greet"
  | "connection_transfer"
  | "company_on_board";

export const ASSISTANCE_KINDS: AssistanceKind[] = [
  "meet_and_greet",
  "check_in",
  "baggage",
  "security_help",
  "airport_navigation",
  "boarding",
  "company_on_board",
  "language_help",
  "wheelchair_push",
  "medication_reminder",
  "connection_transfer",
];

export const ASSISTANCE_LABELS: Record<AssistanceKind, string> = {
  meet_and_greet: "Meet at the airport",
  check_in: "Help at check-in",
  baggage: "Help with baggage",
  security_help: "Help through security",
  airport_navigation: "Getting around the terminal",
  boarding: "Help at the gate and boarding",
  company_on_board: "Company during the flight",
  language_help: "Translation and language help",
  wheelchair_push: "Pushing a wheelchair",
  medication_reminder: "Reminders to take medication",
  connection_transfer: "Help making a connection",
};

/**
 * The language list both sides pick from.
 *
 * A controlled list rather than free text, because matching intersects these
 * two arrays directly — "Punjabi", "punjabi" and "Panjabi" typed freehand
 * would never meet. Ordered by how often they come up on this business's
 * routes, not alphabetically.
 */
export const LANGUAGES = [
  "English",
  "Hindi",
  "Punjabi",
  "Urdu",
  "Gujarati",
  "Bengali",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Arabic",
  "Pashto",
  "Farsi",
  "Somali",
  "Turkish",
  "Polish",
  "Portuguese",
  "Spanish",
  "French",
] as const;

export type ParentTicketListing = {
  id: string;
  reference_number: string;
  profile_id: string;
  listing_kind: ListingKind;

  // The flight
  from_airport: string;
  to_airport: string;
  travel_date: string | null;
  departure_time: string | null;
  airline: string | null;
  flight_number: string | null;
  flight_confirmed: boolean;

  // Shared
  languages: string[];
  fee_amount: number | null;
  currency: string;
  notes: string | null;

  // Traveller side
  capacity: number | null;
  assistance_offered: string[];
  travel_experience: string | null;

  // Requester side
  parent_name: string | null;
  parent_age: number | null;
  relationship: string | null;
  assistance_needed: string[];
  mobility_notes: string | null;
  supervision_notes: string | null;

  // Workflow
  listing_status: ListingStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;

  // Public board
  consent_public: boolean;
  is_public: boolean;

  created_at: string;
  updated_at: string;
};

// ============================================================================
// Matches (full scope items 4 + 6)
// ============================================================================

export type MatchStatus =
  | "suggested"
  | "proposed"
  | "accepted"
  | "declined"
  | "contact_released"
  | "completed"
  | "cancelled";

export const MATCH_STATUSES: MatchStatus[] = [
  "suggested",
  "proposed",
  "accepted",
  "declined",
  "contact_released",
  "completed",
  "cancelled",
];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  suggested: "Suggested",
  proposed: "Proposed",
  accepted: "Accepted",
  declined: "Declined",
  contact_released: "Contact shared",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type PartyResponse = "pending" | "accepted" | "declined";

export const PARTY_RESPONSE_LABELS: Record<PartyResponse, string> = {
  pending: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
};

export type ParentTicketMatch = {
  id: string;
  reference_number: string;
  traveller_listing_id: string;
  requester_listing_id: string;
  match_score: number | null;
  match_reason: string | null;
  match_status: MatchStatus;
  traveller_response: PartyResponse;
  requester_response: PartyResponse;
  contact_released: boolean;
  contact_released_at: string | null;
  contact_released_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * A counterparty's contact details. The ONLY way to obtain one of these is the
 * `parent_ticket_match_contact(match_id)` RPC, which returns nothing unless the
 * match has been released AND the caller is a party to it. Never assemble this
 * shape from a listing or profile read — there isn't one that would work.
 */
export type ReleasedContact = {
  profile_id: string;
  side: ListingKind;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export const MATCH_CONTACT_RPC = "parent_ticket_match_contact";

// ============================================================================
// Payments — Stage A, manual only (full scope item 7)
// ============================================================================

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "refunded"
  | "cancelled";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "unpaid",
  "pending",
  "paid",
  "refunded",
  "cancelled",
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/**
 * How the money actually moved. Every one of these happens OUTSIDE the portal
 * — an admin is recording it after the fact. Card/wallet processing through a
 * provider is a separate future phase and will add its own values here.
 */
export type PaymentMethod = "bank_transfer" | "cash" | "card_manual" | "other";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "cash",
  "card_manual",
  "other",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card_manual: "Card (taken manually)",
  other: "Other",
};

export type ParentTicketPayment = {
  id: string;
  reference_number: string;
  match_id: string;
  payer_profile_id: string | null;
  payee_profile_id: string | null;
  gross_amount: number;
  commission_amount: number;
  payout_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  payout_at: string | null;
  reference_note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// Matching (full scope item 4) — pure, so it can be reasoned about and tested
// ============================================================================

/**
 * How each signal contributes to a 0–100 match score. Route and date are
 * near-absolute: a companion on a different flight is not a companion at all,
 * which is why they carry over half the weight between them. The rest ranks
 * the plausible candidates against each other.
 */
export const MATCH_WEIGHTS = {
  route: 35,
  date: 25,
  assistance: 20,
  language: 12,
  fee: 8,
} as const;

const MATCH_TOTAL_WEIGHT = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);

/** Just the fields scoring reads — so callers can score a form draft too. */
export type MatchableListing = Pick<
  ParentTicketListing,
  | "from_airport"
  | "to_airport"
  | "travel_date"
  | "airline"
  | "flight_number"
  | "languages"
  | "fee_amount"
> & {
  assistance_offered?: string[];
  assistance_needed?: string[];
};

export type MatchBreakdown = {
  /** 0–100, rounded. */
  score: number;
  /** Per-signal share of its own weight, 0–1. */
  parts: Record<keyof typeof MATCH_WEIGHTS, number>;
  /** Human-readable "why these two", for match_reason. */
  reason: string;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function overlap(a: string[] = [], b: string[] = []): number {
  if (a.length === 0 || b.length === 0) return 0;
  const set = new Set(a.map(norm).filter(Boolean));
  const hits = b.map(norm).filter((v) => v && set.has(v));
  return hits.length / Math.min(set.size || 1, b.length || 1);
}

function daysApart(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(a).getTime() - new Date(b).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.abs(ms) / 86_400_000;
}

/**
 * Rank one traveller listing against one requester listing.
 *
 * Scoring only ever RANKS candidates — it never authorises anything. A high
 * score does not make a match, does not approve a listing and above all does
 * not release a contact detail: those are all explicit human steps, enforced in
 * the database. Callers may filter on the score; they may not act on it.
 */
export function scoreMatch(
  traveller: MatchableListing,
  requester: MatchableListing
): MatchBreakdown {
  const why: string[] = [];

  // ---- Route -------------------------------------------------------------
  const sameFrom = norm(traveller.from_airport) === norm(requester.from_airport);
  const sameTo = norm(traveller.to_airport) === norm(requester.to_airport);
  const route = sameFrom && sameTo ? 1 : sameFrom || sameTo ? 0.35 : 0;
  if (route === 1) {
    why.push(`Same route (${traveller.from_airport} → ${traveller.to_airport})`);
  } else if (route > 0) {
    why.push("Partly overlapping route");
  }

  // ---- Date --------------------------------------------------------------
  const gap = daysApart(traveller.travel_date, requester.travel_date);
  let date = 0;
  if (gap !== null) {
    date = gap === 0 ? 1 : gap <= 1 ? 0.7 : gap <= 3 ? 0.4 : gap <= 7 ? 0.15 : 0;
  }
  if (date === 1) why.push("Travelling on the same day");
  else if (date > 0) why.push(`Dates within ${Math.ceil(gap ?? 0)} day(s)`);

  // The same flight is the strongest signal there is — say so explicitly.
  const sameFlight =
    !!norm(traveller.flight_number) &&
    norm(traveller.flight_number) === norm(requester.flight_number);
  if (sameFlight) why.unshift(`Same flight (${traveller.flight_number})`);

  // ---- Assistance --------------------------------------------------------
  const assistance = overlap(
    traveller.assistance_offered,
    requester.assistance_needed
  );
  if (assistance >= 0.99) why.push("Offers everything that's needed");
  else if (assistance > 0) why.push("Offers some of the help needed");

  // ---- Language ----------------------------------------------------------
  const language = overlap(traveller.languages, requester.languages);
  if (language > 0) why.push("Shares a language");

  // ---- Fee ---------------------------------------------------------------
  // The traveller's ask against the requester's budget. No figure on either
  // side is neutral, not a penalty — plenty of arrangements are informal.
  let fee = 0.5;
  const ask = traveller.fee_amount;
  const budget = requester.fee_amount;
  if (ask != null && budget != null) {
    if (ask <= budget) {
      fee = 1;
      why.push("Fee is within budget");
    } else {
      const over = (ask - budget) / Math.max(budget, 1);
      fee = over <= 0.25 ? 0.5 : over <= 0.5 ? 0.2 : 0;
      if (fee === 0) why.push("Fee is well over budget");
    }
  }

  const parts = { route, date, assistance, language, fee };
  const weighted =
    route * MATCH_WEIGHTS.route +
    date * MATCH_WEIGHTS.date +
    assistance * MATCH_WEIGHTS.assistance +
    language * MATCH_WEIGHTS.language +
    fee * MATCH_WEIGHTS.fee;

  // The same-flight bonus can lift a pair, but never past 100.
  const bonus = sameFlight ? 5 : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.round((weighted / MATCH_TOTAL_WEIGHT) * 100) + bonus)
  );

  return {
    score,
    parts,
    reason: why.length ? why.join(" · ") : "Weak match on every signal",
  };
}

/** Where a score sits, for the UI to tint a ranked list consistently. */
export function matchTier(score: number): "strong" | "possible" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 45) return "possible";
  return "weak";
}

/**
 * Whether a listing may be shown on the public board. Mirrors both the DB
 * check constraint and tg_sync_parent_ticket_listing_public() — the database
 * is still the real gate; this exists so the UI doesn't offer an impossible
 * toggle.
 */
export function canPublishListing(
  listing: Pick<ParentTicketListing, "consent_public" | "listing_status">
): boolean {
  return (
    listing.consent_public &&
    PUBLISHABLE_STATUSES.includes(listing.listing_status)
  );
}

/**
 * Whether a match is ready for its contact details to be released. Stage A
 * ties release to a payment an admin has marked paid; the check is here so the
 * admin UI can explain WHY the button is unavailable, not to authorise it —
 * only an admin write to contact_released does that.
 */
export function canReleaseContact(
  match: Pick<ParentTicketMatch, "traveller_response" | "requester_response" | "contact_released">,
  payment: Pick<ParentTicketPayment, "payment_status"> | null
): { ready: boolean; blockedBy: string | null } {
  if (match.contact_released) {
    return { ready: false, blockedBy: "Contact details are already shared." };
  }
  if (match.traveller_response !== "accepted") {
    return { ready: false, blockedBy: "The traveller hasn't accepted yet." };
  }
  if (match.requester_response !== "accepted") {
    return { ready: false, blockedBy: "The requester hasn't accepted yet." };
  }
  if (payment?.payment_status !== "paid") {
    return { ready: false, blockedBy: "No payment has been marked paid." };
  }
  return { ready: true, blockedBy: null };
}
