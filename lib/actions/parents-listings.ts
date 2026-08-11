"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tooManyRecentRows } from "@/lib/security/rate-limit";
import { notify, notifyAdmins } from "@/lib/notify";
import {
  ASSISTANCE_KINDS,
  LANGUAGES,
  LISTING_KINDS,
  type AssistanceKind,
  type ListingKind,
  type ListingStatus,
  type ParentTicketListing,
} from "@/lib/parents-marketplace";

/**
 * Parents Tickets marketplace — listings and requests (full scope items 2, 3
 * and the customer half of 5).
 *
 * Everything runs through the RLS-aware client. The guard trigger
 * tg_guard_parent_ticket_listing() is the real gate on WHICH COLUMNS an owner
 * may change — it silently restores anything they shouldn't have touched — so
 * the validation here exists to produce a readable error instead of a
 * mysterious no-op.
 */

const MAX_SHORT = 120;
const MAX_TEXT = 2000;
const MAX_ARRAY = 24;

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function currentUser() {
  const { user, profile } = await getUserAndProfile();
  return user ? { user, profile } : null;
}

async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
}

/** Trim + strip control characters; empty becomes null. */
function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const out = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return out ? out.slice(0, max) : null;
}

/** Keep only values that are in `allowed`, de-duplicated and capped. */
function cleanSet(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const ok = new Set(allowed);
  return Array.from(new Set(value.filter((v) => typeof v === "string" && ok.has(v)))).slice(
    0,
    MAX_ARRAY
  );
}

function cleanInt(value: unknown, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.round(n), 0), max);
}

function cleanMoney(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(Math.max(n, 0), 5000) * 100) / 100;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// ============================================================================
// The shape a form submits
// ============================================================================

export type ListingInput = {
  listingKind: ListingKind;
  fromAirport: string;
  toAirport: string;
  travelDate: string | null;
  departureTime: string | null;
  airline: string | null;
  flightNumber: string | null;
  flightConfirmed: boolean;
  languages: string[];
  feeAmount: number | null;
  notes: string | null;
  // Traveller side
  capacity: number | null;
  assistanceOffered: AssistanceKind[];
  travelExperience: string | null;
  // Requester side
  parentName: string | null;
  parentAge: number | null;
  relationship: string | null;
  assistanceNeeded: AssistanceKind[];
  mobilityNotes: string | null;
  supervisionNotes: string | null;
  // Public board
  consentPublic: boolean;
};

type ValidationResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validate and narrow a form payload into a writable row.
 *
 * The irrelevant side is written as empty rather than left alone, so switching
 * a draft from traveller to requester cannot leave stale parent details behind
 * on a record that no longer shows them.
 */
function validate(input: ListingInput): ValidationResult {
  if (!LISTING_KINDS.includes(input.listingKind)) {
    return { ok: false, error: "Choose whether you're offering or needing help." };
  }

  const from = clean(input.fromAirport, MAX_SHORT);
  const to = clean(input.toAirport, MAX_SHORT);
  if (!from) return { ok: false, error: "Where does the flight leave from?" };
  if (!to) return { ok: false, error: "Where does the flight land?" };

  const isTraveller = input.listingKind === "traveller";

  const row: Record<string, unknown> = {
    listing_kind: input.listingKind,
    from_airport: from,
    to_airport: to,
    travel_date:
      input.travelDate && DATE_RE.test(input.travelDate) ? input.travelDate : null,
    departure_time:
      input.departureTime && TIME_RE.test(input.departureTime)
        ? input.departureTime
        : null,
    airline: clean(input.airline, MAX_SHORT),
    flight_number: clean(input.flightNumber, 20),
    flight_confirmed: input.flightConfirmed === true,
    languages: cleanSet(input.languages, LANGUAGES),
    fee_amount: cleanMoney(input.feeAmount),
    notes: clean(input.notes, MAX_TEXT),
    consent_public: input.consentPublic === true,

    capacity: isTraveller ? cleanInt(input.capacity, 20) : null,
    assistance_offered: isTraveller
      ? cleanSet(input.assistanceOffered, ASSISTANCE_KINDS)
      : [],
    travel_experience: isTraveller ? clean(input.travelExperience, MAX_TEXT) : null,

    parent_name: isTraveller ? null : clean(input.parentName, MAX_SHORT),
    parent_age: isTraveller ? null : cleanInt(input.parentAge, 120),
    relationship: isTraveller ? null : clean(input.relationship, 80),
    assistance_needed: isTraveller
      ? []
      : cleanSet(input.assistanceNeeded, ASSISTANCE_KINDS),
    mobility_notes: isTraveller ? null : clean(input.mobilityNotes, MAX_TEXT),
    supervision_notes: isTraveller ? null : clean(input.supervisionNotes, MAX_TEXT),
  };

  return { ok: true, row };
}

// ============================================================================
// The owner's own listings
// ============================================================================

/** Everything this person has posted, newest first. */
export async function listMyListings(): Promise<ParentTicketListing[]> {
  const me = await currentUser();
  if (!me) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_listings")
    .select("*")
    .eq("profile_id", me.user.id)
    .order("created_at", { ascending: false })
    .returns<ParentTicketListing[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * One listing the caller owns.
 *
 * Scoped to profile_id as well as id even though RLS would already allow an
 * approved listing through — this is the EDIT path, and it must never open
 * somebody else's record just because it happens to be public.
 */
export async function getMyListing(
  id: string
): Promise<ParentTicketListing | null> {
  const me = await currentUser();
  if (!me) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_listings")
    .select("*")
    .eq("id", id)
    .eq("profile_id", me.user.id)
    .maybeSingle<ParentTicketListing>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createListing(
  input: ListingInput
): Promise<DataResult<{ id: string; reference: string }>> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const valid = validate(input);
  if (!valid.ok) return valid;

  // Abuse throttle. A real person posts a handful of these a month; a script
  // could otherwise fill the review queue and the table overnight. Generous
  // enough that nobody legitimate meets it, and fail-open so an infra hiccup
  // never blocks a genuine listing.
  if (
    await tooManyRecentRows({
      table: "parent_ticket_listings",
      column: "profile_id",
      value: me.user.id,
      windowSec: 60 * 60,
      max: 12,
    })
  ) {
    return {
      ok: false,
      error: "That's a lot of listings in one go — try again in an hour.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_listings")
    .insert({ ...valid.row, profile_id: me.user.id })
    .select("id, reference_number")
    .single<{ id: string; reference_number: string }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save your listing." };
  }
  return { ok: true, data: { id: data.id, reference: data.reference_number } };
}

/**
 * Edit a listing.
 *
 * Only draft and rejected listings are editable. An approved listing is a
 * promise other people are being matched against, so changing its route or
 * date has to go back through review — the UI offers "withdraw and edit"
 * instead.
 */
export async function updateListing(
  id: string,
  input: ListingInput
): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const valid = validate(input);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("parent_ticket_listings")
    .select("listing_status")
    .eq("id", id)
    .eq("profile_id", me.user.id)
    .maybeSingle<{ listing_status: ListingStatus }>();

  if (readError || !current) {
    return { ok: false, error: readError?.message ?? "Listing not found." };
  }
  if (!["draft", "rejected"].includes(current.listing_status)) {
    return {
      ok: false,
      error:
        current.listing_status === "pending_review"
          ? "It's with our team — reopen it first to make changes."
          : "Withdraw this listing before editing it.",
    };
  }

  const { error } = await supabase
    .from("parent_ticket_listings")
    .update(valid.row)
    .eq("id", id)
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send a listing for approval.
 *
 * Verification is required here, not at draft time: people should be able to
 * write their listing while their ID is still being checked, and only the act
 * of joining the board depends on being verified.
 *
 * This gate is a server action rather than a database rule. Every listing is
 * reviewed by a human anyway, and the reviewer sees the person's verification
 * state — so an unverified record reaching the queue would be untidy, not
 * unsafe. Worth revisiting if listings ever auto-approve.
 */
export async function submitListing(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();

  const [{ data: listing }, { data: identity }] = await Promise.all([
    supabase
      .from("parent_ticket_listings")
      .select("listing_status, travel_date, from_airport, to_airport")
      .eq("id", id)
      .eq("profile_id", me.user.id)
      .maybeSingle<
        Pick<
          ParentTicketListing,
          "listing_status" | "travel_date" | "from_airport" | "to_airport"
        >
      >(),
    supabase
      .from("parent_ticket_identities")
      .select("verification_status")
      .eq("profile_id", me.user.id)
      .maybeSingle<{ verification_status: string }>(),
  ]);

  if (!listing) return { ok: false, error: "Listing not found." };
  if (!["draft", "rejected"].includes(listing.listing_status)) {
    return { ok: false, error: "This listing has already been sent." };
  }
  if (!listing.travel_date) {
    return { ok: false, error: "Add a travel date before sending this for review." };
  }
  if (identity?.verification_status !== "verified") {
    return {
      ok: false,
      error: "Get verified first — that's what makes the board trustworthy.",
    };
  }

  const { error } = await supabase
    .from("parent_ticket_listings")
    .update({ listing_status: "pending_review" })
    .eq("id", id)
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };

  // The queue is the admin's job list; it should not depend on them refreshing
  // a page to discover work arrived.
  await notifyAdmins({
    type: "listing_review",
    title: "A listing is waiting for review",
    body: `${listing.from_airport} → ${listing.to_airport}${
      listing.travel_date ? ` on ${listing.travel_date}` : ""
    }`,
    link: `/admin/parents-listings/${id}`,
    actorId: me.user.id,
    actorName: me.profile?.full_name ?? null,
  });

  return { ok: true };
}

/**
 * Turn public display on or off for a listing you own, at any point in its
 * life.
 *
 * Consent is the owner's to give and to withdraw, and until now it could only
 * be changed by editing — which an approved listing does not allow. That meant
 * somebody who changed their mind about being on the public board had no way
 * to say so short of withdrawing the whole listing. Turning consent OFF also
 * takes it off the board immediately, via the sync trigger; turning it ON is a
 * request, not a publication, because an admin still decides what is shown.
 */
export async function setMyListingConsent(input: {
  id: string;
  consent: boolean;
}): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_listings")
    .update({ consent_public: input.consent })
    .eq("id", input.id)
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };

  // Asking to be listed is worth telling an admin about; withdrawing consent
  // needs no action from anyone — the trigger has already taken it down.
  if (input.consent) {
    await notifyAdmins({
      type: "listing_review",
      title: "Someone asked to go on the public board",
      body: "They've opted in — approve the listing's visibility if it's suitable.",
      link: `/admin/parents-listings/${input.id}`,
      actorId: me.user.id,
      actorName: me.profile?.full_name ?? null,
    });
  }

  return { ok: true };
}

/** Pull a listing back out of the review queue to change something. */
export async function reopenListing(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_listings")
    .update({ listing_status: "draft" })
    .eq("id", id)
    .eq("profile_id", me.user.id)
    .eq("listing_status", "pending_review");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Take a listing off the board for good. The row stays — a withdrawn listing
 * may already be attached to a match, and deleting it would take that history
 * with it. The trigger unpublishes it on the way through.
 */
export async function withdrawListing(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_listings")
    .update({ listing_status: "withdrawn" })
    .eq("id", id)
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Delete a draft outright. RLS only allows this while it is still a draft. */
export async function deleteDraftListing(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_listings")
    .delete()
    .eq("id", id)
    .eq("profile_id", me.user.id)
    .eq("listing_status", "draft");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================================
// Admin review (full scope item 5)
// ============================================================================

export type AdminListingRow = ParentTicketListing & {
  profile: { full_name: string | null; email: string | null } | null;
  identity: { verification_status: string } | null;
};

/**
 * The profile embeds through a real foreign key. The identity does NOT:
 * parent_ticket_listings and parent_ticket_identities both hang off
 * profiles.id but have no FK between them, so PostgREST cannot join them and
 * asking it to fails with "Could not find a relationship". The verification
 * status is therefore fetched separately and stitched on below.
 */
const ADMIN_COLUMNS =
  "*, profile:profiles!parent_ticket_listings_profile_id_fkey(full_name, email)";

type ListingWithProfile = Omit<AdminListingRow, "identity">;

/** Attach each owner's verification status in one extra round trip. */
async function withIdentities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ListingWithProfile[]
): Promise<AdminListingRow[]> {
  if (rows.length === 0) return [];

  const ownerIds = Array.from(new Set(rows.map((r) => r.profile_id)));
  const { data: identities } = await supabase
    .from("parent_ticket_identities")
    .select("profile_id, verification_status")
    .in("profile_id", ownerIds)
    .returns<{ profile_id: string; verification_status: string }[]>();

  const byOwner = new Map(
    (identities ?? []).map((i) => [i.profile_id, { verification_status: i.verification_status }])
  );
  return rows.map((r) => ({ ...r, identity: byOwner.get(r.profile_id) ?? null }));
}

/** Every listing, newest activity first. */
export async function listAllListings(): Promise<AdminListingRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_listings")
    .select(ADMIN_COLUMNS)
    .order("updated_at", { ascending: false })
    .returns<ListingWithProfile[]>();
  if (error) throw new Error(error.message);
  return withIdentities(supabase, data ?? []);
}

export async function getListingForAdmin(
  id: string
): Promise<AdminListingRow | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_listings")
    .select(ADMIN_COLUMNS)
    .eq("id", id)
    .maybeSingle<ListingWithProfile>();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [row] = await withIdentities(supabase, [data]);
  return row ?? null;
}

/**
 * Approve or reject a listing, and optionally put an approved one on the
 * public board.
 *
 * Publishing is refused outright without the owner's own opt-in rather than
 * being silently dropped, because an admin ticking a box and seeing nothing
 * happen is worse than being told why.
 */
export async function reviewListing(input: {
  id: string;
  decision: "approved" | "rejected";
  reason?: string;
  publish?: boolean;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const reason = clean(input.reason, 500);
  if (input.decision === "rejected" && !reason) {
    return { ok: false, error: "Give a reason so they know what to fix." };
  }

  const supabase = await createClient();

  let publish = false;
  if (input.decision === "approved" && input.publish) {
    const { data: listing } = await supabase
      .from("parent_ticket_listings")
      .select("consent_public")
      .eq("id", input.id)
      .maybeSingle<{ consent_public: boolean }>();
    if (!listing?.consent_public) {
      return {
        ok: false,
        error: "They didn't agree to public display, so this can't go on the board.",
      };
    }
    publish = true;
  }

  const { data: updated, error } = await supabase
    .from("parent_ticket_listings")
    .update({
      listing_status: input.decision,
      rejection_reason: input.decision === "rejected" ? reason : null,
      is_public: input.decision === "approved" ? publish : false,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("id, profile_id, reference_number, from_airport, to_airport, is_public")
    .single<{
      id: string;
      profile_id: string;
      reference_number: string;
      from_airport: string;
      to_airport: string;
      is_public: boolean;
    }>();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Could not save the decision." };
  }

  // Tell the person. Without this they would have to keep opening the portal
  // to find out whether anything happened — which is the whole reason a
  // review queue feels slow even when it isn't.
  const base = await listingBasePath(updated.profile_id);
  await notify({
    recipientId: updated.profile_id,
    type: "listing_review",
    title:
      input.decision === "approved"
        ? `${updated.reference_number} is approved`
        : `${updated.reference_number} needs a change`,
    body:
      input.decision === "approved"
        ? updated.is_public
          ? `${updated.from_airport} → ${updated.to_airport} is live on the board and can be matched.`
          : `${updated.from_airport} → ${updated.to_airport} can now be matched.`
        : reason,
    link: `${base}/${updated.id}`,
    actorId: user.id,
  });

  return { ok: true };
}

/** A helper manages listings at /helper; everyone else at /customer/parents. */
async function listingBasePath(profileId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle<{ role: string }>();
  return data?.role === "helper" ? "/helper" : "/customer/parents";
}

/** Toggle an already-approved listing on or off the public board. */
export async function setListingPublic(input: {
  id: string;
  isPublic: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  if (input.isPublic) {
    const { data: listing } = await supabase
      .from("parent_ticket_listings")
      .select("consent_public, listing_status")
      .eq("id", input.id)
      .maybeSingle<{ consent_public: boolean; listing_status: ListingStatus }>();
    if (!listing?.consent_public) {
      return { ok: false, error: "They didn't agree to public display." };
    }
    if (!["approved", "matched"].includes(listing.listing_status)) {
      return { ok: false, error: "Only an approved listing can go on the board." };
    }
  }

  const { error } = await supabase
    .from("parent_ticket_listings")
    .update({ is_public: input.isPublic })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Listings waiting on a human — the sidebar's warm figure. Fails open to 0. */
export async function countPendingListings(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("parent_ticket_listings")
      .select("id", { count: "exact", head: true })
      .eq("listing_status", "pending_review");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
