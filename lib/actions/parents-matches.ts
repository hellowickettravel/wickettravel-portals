"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notify, notifyAdmins } from "@/lib/notify";
import { isUuid } from "@/lib/db/errors";
import {
  scoreMatch,
  type MatchStatus,
  type ParentTicketListing,
  type ParentTicketMatch,
  type PartyResponse,
} from "@/lib/parents-marketplace";

/**
 * Parents Tickets marketplace — search, ranking and matches (full scope item 4).
 *
 * Two things this file deliberately does NOT do:
 *
 *   • It never creates a match on a party's behalf. The database refuses it
 *     outright ("Matches are created by Wicket, not by a party") because an
 *     introduction here is a brokered service someone is paid for, not a swipe.
 *   • It never releases a contact detail. Scoring only ever RANKS — a 100 means
 *     "look at these two", not "they may now email each other". Release is a
 *     separate, explicit admin act.
 */

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

// ============================================================================
// Search + ranking
// ============================================================================

export type Candidate = {
  listing: ParentTicketListing;
  /** Name only. See CANDIDATE_COLUMNS for why there is no email here. */
  owner: { full_name: string | null } | null;
  score: number;
  reason: string;
  /** Set when these two are already paired, so the UI offers "open" not "propose". */
  existingMatchId: string | null;
};

/**
 * The owner's NAME and nothing else.
 *
 * An admin is entitled to a party's email — it's on the listing and the
 * verification record, both a click away. But no screen in this file renders
 * one, and a field selected here rides along in the RSC payload whether it is
 * displayed or not. Contact details on a match screen are exactly the thing
 * this feature is careful about, so they are not fetched at all rather than
 * fetched and ignored.
 */
const CANDIDATE_COLUMNS =
  "*, profile:profiles!parent_ticket_listings_profile_id_fkey(full_name)";

type ListingWithOwner = ParentTicketListing & {
  profile: { full_name: string | null } | null;
};

/**
 * Rank the plausible counterparts for one listing, best first.
 *
 * Scoring happens here rather than in SQL because it weighs five signals
 * against each other and has to explain itself in words — that belongs in one
 * readable, testable function, not spread across a query. The candidate pool
 * is narrowed in the database first (opposite kind, approved, and where both
 * carry a date, within a fortnight) so only a sane number of rows are scored.
 *
 * `minScore` is a floor, not a threshold for action: a weak match is still
 * worth an admin's glance when there is nothing better.
 */
export async function findCandidates(
  listingId: string,
  opts: { limit?: number; minScore?: number } = {}
): Promise<DataResult<Candidate[]>> {
  await requireAdmin();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const minScore = opts.minScore ?? 1;

  const supabase = await createClient();

  const { data: subject, error: subjectError } = await supabase
    .from("parent_ticket_listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle<ParentTicketListing>();

  if (subjectError || !subject) {
    return { ok: false, error: subjectError?.message ?? "Listing not found." };
  }

  const wantKind = subject.listing_kind === "traveller" ? "requester" : "traveller";

  let query = supabase
    .from("parent_ticket_listings")
    .select(CANDIDATE_COLUMNS)
    .eq("listing_kind", wantKind)
    .in("listing_status", ["approved", "matched"])
    .neq("profile_id", subject.profile_id); // never pair someone with themselves

  // A fortnight either side. Without a date on the subject there is nothing to
  // narrow by, so every approved counterpart is scored and the date signal
  // simply contributes nothing.
  if (subject.travel_date) {
    const day = 86_400_000;
    const at = new Date(subject.travel_date).getTime();
    query = query
      .gte("travel_date", new Date(at - 14 * day).toISOString().slice(0, 10))
      .lte("travel_date", new Date(at + 14 * day).toISOString().slice(0, 10));
  }

  const { data: pool, error: poolError } = await query
    .limit(200)
    .returns<ListingWithOwner[]>();

  if (poolError) return { ok: false, error: poolError.message };
  if (!pool?.length) return { ok: true, data: [] };

  // Which of these are already paired with the subject?
  const { data: existing } = await supabase
    .from("parent_ticket_matches")
    .select("id, traveller_listing_id, requester_listing_id")
    .or(
      `traveller_listing_id.eq.${subject.id},requester_listing_id.eq.${subject.id}`
    )
    .returns<
      { id: string; traveller_listing_id: string; requester_listing_id: string }[]
    >();

  const pairedWith = new Map<string, string>();
  for (const m of existing ?? []) {
    const other =
      m.traveller_listing_id === subject.id
        ? m.requester_listing_id
        : m.traveller_listing_id;
    pairedWith.set(other, m.id);
  }

  const isSubjectTraveller = subject.listing_kind === "traveller";

  const scored = pool
    .map((candidate) => {
      const { profile, ...listing } = candidate;
      const breakdown = isSubjectTraveller
        ? scoreMatch(subject, listing)
        : scoreMatch(listing, subject);
      return {
        listing: listing as ParentTicketListing,
        owner: profile,
        score: breakdown.score,
        reason: breakdown.reason,
        existingMatchId: pairedWith.get(candidate.id) ?? null,
      };
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { ok: true, data: scored };
}

// ============================================================================
// Matches — admin
// ============================================================================

export type AdminMatchRow = ParentTicketMatch & {
  traveller: ListingWithOwner | null;
  requester: ListingWithOwner | null;
};

const MATCH_COLUMNS = `*,
  traveller:parent_ticket_listings!parent_ticket_matches_traveller_listing_id_fkey(${CANDIDATE_COLUMNS}),
  requester:parent_ticket_listings!parent_ticket_matches_requester_listing_id_fkey(${CANDIDATE_COLUMNS})`;

/** Every match, strongest and newest first. */
export async function listMatches(): Promise<AdminMatchRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_matches")
    .select(MATCH_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<AdminMatchRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMatchForAdmin(id: string): Promise<AdminMatchRow | null> {
  await requireAdmin();
  // A dynamic route segment matches ANY path segment, so this is reachable
  // with junk from the URL bar. Postgres raises 22P02 on a malformed uuid,
  // which an RSC turns into a 500 — "no such record" is the honest answer.
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .maybeSingle<AdminMatchRow>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Pair two listings and propose it to both sides.
 *
 * The score is recomputed here from the two records rather than trusted from
 * the client — a number that decides what an admin sees first should not be
 * settable by whoever calls the endpoint.
 */
export async function createMatch(input: {
  travellerListingId: string;
  requesterListingId: string;
}): Promise<DataResult<{ id: string; reference: string }>> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: sides, error: readError } = await supabase
    .from("parent_ticket_listings")
    .select("*")
    .in("id", [input.travellerListingId, input.requesterListingId])
    .returns<ParentTicketListing[]>();

  if (readError) return { ok: false, error: readError.message };

  const traveller = sides?.find((l) => l.id === input.travellerListingId);
  const requester = sides?.find((l) => l.id === input.requesterListingId);
  if (!traveller || !requester) {
    return { ok: false, error: "One of those listings no longer exists." };
  }
  if (traveller.listing_kind !== "traveller" || requester.listing_kind !== "requester") {
    return { ok: false, error: "A match needs one traveller and one requester." };
  }
  if (traveller.profile_id === requester.profile_id) {
    return { ok: false, error: "That's the same person on both sides." };
  }
  for (const side of [traveller, requester]) {
    if (!["approved", "matched"].includes(side.listing_status)) {
      return {
        ok: false,
        error: `${side.reference_number} isn't approved, so it can't be matched yet.`,
      };
    }
  }

  const breakdown = scoreMatch(traveller, requester);

  const { data, error } = await supabase
    .from("parent_ticket_matches")
    .insert({
      traveller_listing_id: traveller.id,
      requester_listing_id: requester.id,
      match_score: breakdown.score,
      match_reason: breakdown.reason,
      match_status: "proposed",
      created_by: user.id,
    })
    .select("id, reference_number")
    .single<{ id: string; reference_number: string }>();

  if (error || !data) {
    // The unique index on the pair is the likeliest cause, and "already
    // matched" is far more useful than the constraint name.
    const already = error?.code === "23505";
    return {
      ok: false,
      error: already
        ? "These two are already matched."
        : (error?.message ?? "Could not create the match."),
    };
  }

  // Both sides need to know there is something to answer — a match nobody is
  // told about is a match nobody accepts. Neither message names the other
  // person: that stays sealed until an introduction is released.
  await Promise.all([
    notify({
      recipientId: traveller.profile_id,
      type: "match",
      title: "We've found someone for one of your trips",
      body: `A family travelling ${requester.from_airport} → ${requester.to_airport}. Accept to let us introduce you.`,
      actorId: user.id,
    }),
    notify({
      recipientId: requester.profile_id,
      type: "match",
      title: "We've found a traveller for your request",
      body: `Someone going ${traveller.from_airport} → ${traveller.to_airport}. Accept to let us introduce you.`,
      actorId: user.id,
    }),
  ]);

  return { ok: true, data: { id: data.id, reference: data.reference_number } };
}

/**
 * Move a match along by hand. Deliberately cannot set 'contact_released' —
 * that is its own action, tied to a payment, and lives in the next chunk.
 */
export async function setMatchStatus(input: {
  id: string;
  status: Exclude<MatchStatus, "contact_released">;
}): Promise<ActionResult> {
  await requireAdmin();
  if (input.status === ("contact_released" as MatchStatus)) {
    return { ok: false, error: "Releasing contact details is a separate step." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_matches")
    .update({ match_status: input.status })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Matches still waiting on someone — the sidebar's warm figure. */
export async function countOpenMatches(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("parent_ticket_matches")
      .select("id", { count: "exact", head: true })
      .in("match_status", ["suggested", "proposed", "accepted"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// Matches — the customer's own
// ============================================================================

export type MyMatch = {
  match: ParentTicketMatch;
  /** The caller's own listing in this pairing. */
  mine: ParentTicketListing;
  /** The other side, WITHOUT its owner — no contact details until release. */
  theirs: ParentTicketListing;
  /** Which side the caller is on, and therefore which response is theirs. */
  side: "traveller" | "requester";
  myResponse: PartyResponse;
  theirResponse: PartyResponse;
};

/**
 * The caller's own matches.
 *
 * The other listing is read WITHOUT its owner's profile. That isn't only a
 * privacy nicety — profiles' RLS wouldn't return a stranger's row anyway, and
 * the only sanctioned route to a counterparty's name, email or phone is the
 * parent_ticket_match_contact RPC after release.
 */
export async function listMyMatches(): Promise<MyMatch[]> {
  const me = await currentUser();
  if (!me) return [];

  const supabase = await createClient();

  const { data: mine } = await supabase
    .from("parent_ticket_listings")
    .select("*")
    .eq("profile_id", me.user.id)
    .returns<ParentTicketListing[]>();

  if (!mine?.length) return [];
  const myIds = new Set(mine.map((l) => l.id));

  // RLS already scopes this to matches the caller is party to.
  const { data: matches, error } = await supabase
    .from("parent_ticket_matches")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ParentTicketMatch[]>();

  if (error || !matches?.length) return [];

  const otherIds = matches
    .map((m) => (myIds.has(m.traveller_listing_id) ? m.requester_listing_id : m.traveller_listing_id))
    .filter((id) => !myIds.has(id));

  const { data: others } = otherIds.length
    ? await supabase
        .from("parent_ticket_listings")
        .select("*")
        .in("id", otherIds)
        .returns<ParentTicketListing[]>()
    : { data: [] as ParentTicketListing[] };

  const byId = new Map<string, ParentTicketListing>(
    [...mine, ...(others ?? [])].map((l) => [l.id, l])
  );

  const out: MyMatch[] = [];
  for (const match of matches) {
    const iAmTraveller = myIds.has(match.traveller_listing_id);
    const mineListing = byId.get(
      iAmTraveller ? match.traveller_listing_id : match.requester_listing_id
    );
    const theirsListing = byId.get(
      iAmTraveller ? match.requester_listing_id : match.traveller_listing_id
    );
    if (!mineListing || !theirsListing) continue;

    out.push({
      match,
      mine: mineListing,
      theirs: theirsListing,
      side: iAmTraveller ? "traveller" : "requester",
      myResponse: iAmTraveller ? match.traveller_response : match.requester_response,
      theirResponse: iAmTraveller ? match.requester_response : match.traveller_response,
    });
  }
  return out;
}

/**
 * Accept or decline a match, for the caller's own side only.
 *
 * Which column that is, is decided here from the caller's own listings — and
 * decided again by the guard trigger, which restores the other side's response
 * whatever this sends. Two independent answers to the same question, on
 * purpose.
 */
export async function respondToMatch(input: {
  matchId: string;
  response: Exclude<PartyResponse, "pending">;
}): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };
  if (!["accepted", "declined"].includes(input.response)) {
    return { ok: false, error: "Choose accept or decline." };
  }

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("parent_ticket_matches")
    .select("traveller_listing_id, requester_listing_id, contact_released")
    .eq("id", input.matchId)
    .maybeSingle<
      Pick<
        ParentTicketMatch,
        "traveller_listing_id" | "requester_listing_id" | "contact_released"
      >
    >();

  if (!match) return { ok: false, error: "Match not found." };
  if (match.contact_released) {
    return { ok: false, error: "You've already been introduced on this one." };
  }

  const { data: mine } = await supabase
    .from("parent_ticket_listings")
    .select("id")
    .eq("profile_id", me.user.id)
    .in("id", [match.traveller_listing_id, match.requester_listing_id])
    .returns<{ id: string }[]>();

  const myListingId = mine?.[0]?.id;
  if (!myListingId) return { ok: false, error: "That isn't your match." };

  const column =
    myListingId === match.traveller_listing_id
      ? "traveller_response"
      : "requester_response";

  const { error } = await supabase
    .from("parent_ticket_matches")
    .update({ [column]: input.response })
    .eq("id", input.matchId);

  if (error) return { ok: false, error: error.message };

  // An answer is the signal an admin acts on — once both sides are in, the
  // introduction is theirs to make.
  await notifyAdmins({
    type: "match",
    title: `A ${column === "traveller_response" ? "traveller" : "family"} ${input.response} a match`,
    body:
      input.response === "accepted"
        ? "If both sides have now accepted, the introduction can be released."
        : null,
    link: `/admin/parents-matches/${input.matchId}`,
    actorId: me.user.id,
    actorName: me.profile?.full_name ?? null,
  });

  return { ok: true };
}
