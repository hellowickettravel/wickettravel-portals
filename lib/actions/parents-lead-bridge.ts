"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGES } from "@/lib/parents-marketplace";
import type { ParentTicketEnquiry } from "@/lib/parents-tickets";

/**
 * The bridge from a public LEAD to a marketplace LISTING.
 *
 * Two Parents Tickets funnels grew up side by side and never touched: the
 * homepage form drops a lead into an admin queue, and the marketplace waits
 * for people who already know it exists. This closes that gap — an admin can
 * take a lead they were going to phone anyway and bring the person into the
 * marketplace instead.
 *
 * WHAT THIS CANNOT DO, BY DESIGN
 *   It cannot create an account. A listing hangs off a profile, and the whole
 *   point of the marketplace is that the person behind it has been verified —
 *   so a lead can only become a listing once its author holds an account. If
 *   they do, the lead is attached to it; if they don't, the admin sends them a
 *   sign-up link and the lead waits.
 *
 * WHAT THE CONVERSION DELIBERATELY DOES NOT GUESS
 *   The assistance checkboxes. The lead's free text ("help with wheelchair and
 *   check-in") cannot be mapped onto the controlled ASSISTANCE_KINDS list
 *   without inventing intent, and matching intersects those arrays directly —
 *   a wrong guess would silently produce wrong matches. The text is carried
 *   into the notes instead, and the person ticks the boxes themselves.
 */

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
  return user;
}

export type LeadBridgeState = {
  /** The account matching the lead's email address, if there is one. */
  account: { id: string; full_name: string | null; email: string | null } | null;
  /** Whether that account has been verified for the marketplace. */
  verification: string | null;
  /** The listing this lead already became, if any. */
  listing: {
    id: string;
    reference_number: string;
    listing_status: string;
  } | null;
  invitedAt: string | null;
};

/**
 * Everything the "Bring into the marketplace" card needs, in one read.
 *
 * The account lookup is by email, which is the only handle a lead gives us —
 * the form is anonymous, so there is no id to join on.
 */
export async function getLeadBridgeState(
  leadId: string
): Promise<DataResult<LeadBridgeState>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("parent_ticket_enquiries")
    .select("email, converted_listing_id, invited_at")
    .eq("id", leadId)
    .maybeSingle<{
      email: string;
      converted_listing_id: string | null;
      invited_at: string | null;
    }>();

  if (error || !lead) {
    return { ok: false, error: error?.message ?? "Lead not found." };
  }

  const state: LeadBridgeState = {
    account: null,
    verification: null,
    listing: null,
    invitedAt: lead.invited_at,
  };

  const { data: account } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", lead.email)
    .limit(1)
    .maybeSingle<{ id: string; full_name: string | null; email: string | null }>();

  if (account) {
    state.account = account;
    const { data: identity } = await supabase
      .from("parent_ticket_identities")
      .select("verification_status")
      .eq("profile_id", account.id)
      .maybeSingle<{ verification_status: string }>();
    state.verification = identity?.verification_status ?? "unverified";
  }

  if (lead.converted_listing_id) {
    const { data: listing } = await supabase
      .from("parent_ticket_listings")
      .select("id, reference_number, listing_status")
      .eq("id", lead.converted_listing_id)
      .maybeSingle<{
        id: string;
        reference_number: string;
        listing_status: string;
      }>();
    state.listing = listing ?? null;
  }

  return { ok: true, data: state };
}

/** Map the lead's free-text languages onto the controlled list. */
function matchLanguages(value: string | null): string[] {
  if (!value) return [];
  const said = value.toLowerCase();
  return LANGUAGES.filter((l) => said.includes(l.toLowerCase()));
}

/** Fold the lead's free text into one notes block, labelled so it reads well. */
function carriedNotes(lead: ParentTicketEnquiry): string | null {
  const parts: string[] = [];
  if (lead.notes) parts.push(lead.notes.trim());

  const freeform =
    lead.enquiry_type === "traveller" ? lead.assistance_offered : lead.assistance_needed;
  if (freeform) {
    parts.push(
      `${lead.enquiry_type === "traveller" ? "Help offered" : "Help needed"} (from their enquiry): ${freeform.trim()}`
    );
  }
  if (lead.languages) parts.push(`Languages they wrote: ${lead.languages.trim()}`);

  parts.push(`Brought across from enquiry ${lead.reference_number}.`);
  return parts.join("\n\n").slice(0, 2000);
}

/**
 * Create a DRAFT listing for the account behind this lead, pre-filled from what
 * they already told us.
 *
 * A draft, not a submission: the person still has to check it, tick the
 * assistance boxes and send it for review, and they still have to be verified
 * before it can go anywhere. An admin filling a listing in on someone's behalf
 * and pushing it live would put words in their mouth on a record other
 * families make decisions from.
 */
export async function createListingFromLead(
  leadId: string
): Promise<DataResult<{ id: string; reference: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("parent_ticket_enquiries")
    .select("*")
    .eq("id", leadId)
    .maybeSingle<ParentTicketEnquiry & { converted_listing_id: string | null }>();

  if (error || !lead) {
    return { ok: false, error: error?.message ?? "Lead not found." };
  }
  if (lead.converted_listing_id) {
    return { ok: false, error: "This lead has already been brought across." };
  }

  const { data: account } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", lead.email)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!account) {
    return {
      ok: false,
      error: "No account with that email yet — send them the invite first.",
    };
  }

  const isTraveller = lead.enquiry_type === "traveller";

  const { data: created, error: insertError } = await supabase
    .from("parent_ticket_listings")
    .insert({
      profile_id: account.id,
      listing_kind: lead.enquiry_type,
      from_airport: lead.from_location,
      to_airport: lead.to_location,
      travel_date: lead.travel_date,
      airline: lead.airline,
      languages: matchLanguages(lead.languages),
      // The lead's amount is a companion fee either way; which column it lands
      // in depends on the side.
      fee_amount: isTraveller ? lead.fee_amount : lead.offer_amount,
      notes: carriedNotes(lead),
      consent_public: lead.consent_public,
      capacity: isTraveller ? lead.parents_can_help : null,
      parent_name: isTraveller ? null : lead.parent_name,
      parent_age: isTraveller ? null : lead.parent_age,
      relationship: isTraveller ? null : lead.relationship,
      mobility_notes: isTraveller ? null : lead.mobility_needs,
      listing_status: "draft",
    })
    .select("id, reference_number")
    .single<{ id: string; reference_number: string }>();

  if (insertError || !created) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not create the listing.",
    };
  }

  const { error: linkError } = await supabase
    .from("parent_ticket_enquiries")
    .update({ converted_listing_id: created.id, status: "matched" })
    .eq("id", leadId);

  if (linkError) {
    // The listing exists; say so rather than pretending nothing happened.
    return {
      ok: false,
      error: `Listing ${created.reference_number} was created but the lead couldn't be linked: ${linkError.message}`,
    };
  }

  return { ok: true, data: { id: created.id, reference: created.reference_number } };
}

/**
 * Record that this person has been sent a sign-up invite.
 *
 * The portal doesn't send the email — an admin does, from their own inbox,
 * using the mailto the screen hands them. This only stamps that it happened,
 * so the queue shows who has already been chased and nobody gets invited twice.
 */
export async function markLeadInvited(leadId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("parent_ticket_enquiries")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
