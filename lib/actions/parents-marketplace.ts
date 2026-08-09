"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ID_DOCUMENT_BUCKET, SIGNED_URL_TTL } from "@/lib/storage";
import {
  ID_DOCUMENT_TYPES,
  type IdDocumentType,
  type ParentTicketIdentity,
  type VerificationStatus,
} from "@/lib/parents-marketplace";

/**
 * Parents Tickets marketplace — identity verification (full scope item 1).
 *
 * Reads and writes go through the RLS-aware client, so the policies and guard
 * triggers in APPLY_PARENTS_FULLSCOPE_0.sql are the real gate. The checks here
 * exist to give clean errors instead of silent no-ops: the database will
 * quietly restore a field an owner isn't allowed to set, which is right for
 * security and useless as a message to a person.
 *
 * The one place the service-role client appears is reading
 * auth.users.email_confirmed_at, which no RLS-scoped query can see. That read
 * is scoped to the caller's OWN id.
 */

const MAX_NAME = 150;
const MAX_PHONE = 30;
const MAX_REASON = 500;

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** The signed-in user, or null. */
async function currentUser() {
  const { user, profile } = await getUserAndProfile();
  return user ? { user, profile } : null;
}

async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
}

/** Trim + strip control characters; empty becomes null — same rule as the intake API. */
function clean(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const out = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return out ? out.slice(0, max) : null;
}

// ============================================================================
// The person's own record
// ============================================================================

/**
 * The caller's verification record, creating an empty one on first visit.
 *
 * Doing the insert here rather than on first save keeps the screen simple —
 * it always has a row to render — and costs nothing: an unverified record with
 * no document in it conveys no trust and is exactly what the schema defaults
 * to. The guard trigger makes sure the row can only ever be born unverified,
 * whatever this sends.
 */
export async function getOrCreateMyIdentity(): Promise<
  DataResult<ParentTicketIdentity>
> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("parent_ticket_identities")
    .select("*")
    .eq("profile_id", me.user.id)
    .maybeSingle<ParentTicketIdentity>();

  if (error) return { ok: false, error: error.message };
  if (existing) return { ok: true, data: existing };

  const { data: created, error: insertError } = await supabase
    .from("parent_ticket_identities")
    // Seed the name from the account so the form opens with something sensible.
    // The phone is left blank on purpose: getUserAndProfile doesn't select it,
    // and a guessed number on an identity record is worse than an empty field.
    .insert({
      profile_id: me.user.id,
      legal_name: me.profile?.full_name ?? null,
    })
    .select("*")
    .single<ParentTicketIdentity>();

  if (insertError || !created) {
    return { ok: false, error: insertError?.message ?? "Could not start verification." };
  }
  return { ok: true, data: created };
}

/** Save the name/DOB/phone the document has to match. */
export async function saveIdentityDetails(input: {
  legalName: string;
  dateOfBirth: string | null;
  phone: string;
}): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const legalName = clean(input.legalName, MAX_NAME);
  if (!legalName) return { ok: false, error: "Enter the name on your document." };

  const phone = clean(input.phone, MAX_PHONE);
  if (!phone) return { ok: false, error: "Enter a phone number." };

  // A date we can't parse is stored as nothing rather than guessed at.
  const dob =
    input.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)
      ? input.dateOfBirth
      : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_identities")
    .update({ legal_name: legalName, date_of_birth: dob, phone })
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Record an ID document that has already been uploaded to the private bucket.
 *
 * The upload happens from the browser (lib/storage.ts) so a large file never
 * round-trips through a server action; this only writes the resulting path.
 * The path is re-derived from the caller's own id rather than trusted, so a
 * tampered client cannot point their record at somebody else's document.
 */
export async function recordIdDocument(input: {
  documentType: IdDocumentType;
  path: string;
}): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  if (!ID_DOCUMENT_TYPES.includes(input.documentType)) {
    return { ok: false, error: "Choose a document type." };
  }
  if (!input.path.startsWith(`${me.user.id}/`)) {
    return { ok: false, error: "That upload doesn't belong to this account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_identities")
    .update({
      id_document_type: input.documentType,
      id_document_path: input.path,
      id_document_uploaded_at: new Date().toISOString(),
    })
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Hand the record to an admin for review.
 *
 * The email check runs here rather than at save time because it is the one
 * precondition the person can't fix from this screen — telling them at the
 * moment they try to submit is the only useful place to say it.
 */
export async function submitIdentityForReview(): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: identity, error: readError } = await supabase
    .from("parent_ticket_identities")
    .select("legal_name, id_document_path, verification_status")
    .eq("profile_id", me.user.id)
    .maybeSingle<
      Pick<ParentTicketIdentity, "legal_name" | "id_document_path" | "verification_status">
    >();

  if (readError || !identity) {
    return { ok: false, error: readError?.message ?? "Start verification first." };
  }
  if (identity.verification_status === "verified") {
    return { ok: false, error: "You're already verified." };
  }
  if (!identity.legal_name) {
    return { ok: false, error: "Add the name on your document first." };
  }
  if (!identity.id_document_path) {
    return { ok: false, error: "Upload your ID document first." };
  }

  const emailOk = await refreshEmailVerified();
  if (!emailOk.ok) return emailOk;
  if (!emailOk.data) {
    return {
      ok: false,
      error: "Confirm your email address first — check your inbox for the link.",
    };
  }

  const { error } = await supabase
    .from("parent_ticket_identities")
    .update({ verification_status: "pending_review" })
    .eq("profile_id", me.user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Pull the record back out of the queue to change something. */
export async function withdrawIdentityFromReview(): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_identities")
    .update({ verification_status: "unverified" })
    .eq("profile_id", me.user.id)
    .eq("verification_status", "pending_review");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Sync email_verified from Supabase Auth and return the result.
 *
 * There is deliberately no second email-verification system here: this project
 * already has confirmation switched on, so auth.users.email_confirmed_at is
 * the one true answer and the column on the identity record is a cache of it.
 * Building a parallel token flow would give two sources of truth that can
 * disagree.
 *
 * email_verified is admin-only at the database level, so the write goes
 * through the service-role client — reading, and then writing, only the
 * caller's own row.
 */
export async function refreshEmailVerified(): Promise<DataResult<boolean>> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "Not signed in." };

  // The caller's own session already carries this — no privileged read needed.
  const confirmedAt = me.user.email_confirmed_at ?? null;
  const verified = !!confirmedAt;

  // The WRITE does need the service role: email_verified is admin-only at the
  // database level precisely so nobody can grant it to themselves. Scoped to
  // the caller's own row.
  const admin = createAdminClient();
  const { error: writeError } = await admin
    .from("parent_ticket_identities")
    .update({ email_verified: verified, email_verified_at: confirmedAt })
    .eq("profile_id", me.user.id);

  if (writeError) return { ok: false, error: writeError.message };
  return { ok: true, data: verified };
}

// ============================================================================
// Admin review
// ============================================================================

export type VerificationQueueRow = {
  profile_id: string;
  legal_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  id_document_type: IdDocumentType | null;
  id_document_path: string | null;
  id_document_uploaded_at: string | null;
  email_verified: boolean;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  updated_at: string;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

const QUEUE_COLUMNS =
  "profile_id, legal_name, phone, date_of_birth, id_document_type, id_document_path, id_document_uploaded_at, email_verified, verification_status, rejection_reason, reviewed_at, updated_at, created_at, profile:profiles!parent_ticket_identities_profile_id_fkey(full_name, email)";

/** Every verification record, the ones waiting on a human first. */
export async function listVerifications(): Promise<VerificationQueueRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_identities")
    .select(QUEUE_COLUMNS)
    .order("updated_at", { ascending: false })
    .returns<VerificationQueueRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** One verification record, or null. */
export async function getVerification(
  profileId: string
): Promise<VerificationQueueRow | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_identities")
    .select(QUEUE_COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle<VerificationQueueRow>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * A short-lived signed URL for an ID document, minted at the moment an admin
 * opens the record. Never stored, never returned to the person who uploaded
 * it, and never generated for a record with no document.
 */
export async function signIdDocument(
  profileId: string
): Promise<DataResult<string>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: identity, error } = await supabase
    .from("parent_ticket_identities")
    .select("id_document_path")
    .eq("profile_id", profileId)
    .maybeSingle<{ id_document_path: string | null }>();

  if (error || !identity?.id_document_path) {
    return { ok: false, error: "No document on this record." };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ID_DOCUMENT_BUCKET)
    .createSignedUrl(identity.id_document_path, SIGNED_URL_TTL);

  if (signError || !signed?.signedUrl) {
    return { ok: false, error: signError?.message ?? "Could not open the document." };
  }
  return { ok: true, data: signed.signedUrl };
}

/**
 * Approve or reject a verification.
 *
 * Rejection requires a reason: the person has to be told what to fix, and an
 * unexplained rejection just produces a support ticket.
 */
export async function reviewIdentity(input: {
  profileId: string;
  decision: "verified" | "rejected";
  reason?: string;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const reason = clean(input.reason, MAX_REASON);
  if (input.decision === "rejected" && !reason) {
    return { ok: false, error: "Give a reason so they know what to fix." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_identities")
    .update({
      verification_status: input.decision,
      rejection_reason: input.decision === "rejected" ? reason : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("profile_id", input.profileId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Count of records waiting on a human — the sidebar's warm figure. Fails open
 * to 0 so the admin portal still renders if the schema isn't applied.
 */
export async function countPendingVerifications(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("parent_ticket_identities")
      .select("profile_id", { count: "exact", head: true })
      .eq("verification_status", "pending_review");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
