"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MATCH_CONTACT_RPC,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  canReleaseContact,
  type ParentTicketPayment,
  type PaymentMethod,
  type PaymentStatus,
  type ReleasedContact,
} from "@/lib/parents-marketplace";

/**
 * Parents Tickets marketplace — Stage A payments and contact release
 * (full scope items 6 and 7).
 *
 * These two are one chunk because they are one decision: money moves outside
 * the system, an admin records that it did, and only then are the two parties
 * introduced. Splitting them would ship a release button nothing could unlock.
 *
 * STAGE A MEANS MANUAL. Nothing here talks to Stripe, PayPal or any provider.
 * An admin is writing down what already happened — a bank transfer, cash, a
 * card machine — so every figure is typed by a person and every one of them is
 * editable afterwards. Real provider integration is a separate future phase
 * that will add columns to this table, not replace it.
 */

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const out = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return out ? out.slice(0, max) : null;
}

/** Money to two places, clamped to a sane range. Never negative. */
function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(Math.max(n, 0), 100_000) * 100) / 100;
}

// ============================================================================
// The payment record on a match
// ============================================================================

export type MatchPayment = ParentTicketPayment;

/** The payment attached to a match, or null if none has been recorded. */
export async function getMatchPayment(
  matchId: string
): Promise<MatchPayment | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_payments")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MatchPayment>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export type PaymentInput = {
  matchId: string;
  grossAmount: number;
  commissionAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  referenceNote: string | null;
  /** ISO date the money actually arrived. Blank keeps whatever is on record. */
  paidOn: string | null;
};

/**
 * Create or update the payment record for a match.
 *
 * `payout_amount` is derived, never typed: it is gross minus commission by
 * definition, and letting someone enter all three would let the arithmetic
 * disagree with itself on a record the business reports from. Commission above
 * gross is rejected rather than clamped — that is a typo, and silently turning
 * it into zero payout would hide it.
 */
export async function saveMatchPayment(
  input: PaymentInput
): Promise<DataResult<{ id: string; reference: string }>> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  if (!PAYMENT_STATUSES.includes(input.paymentStatus)) {
    return { ok: false, error: "Pick a payment status." };
  }
  if (input.paymentMethod && !PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { ok: false, error: "Pick how the money moved." };
  }

  const gross = money(input.grossAmount);
  const commission = money(input.commissionAmount);
  if (commission > gross) {
    return { ok: false, error: "Commission can't be more than the amount paid." };
  }
  const payout = Math.round((gross - commission) * 100) / 100;

  const paid = input.paymentStatus === "paid";
  const paidAt =
    input.paidOn && /^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)
      ? new Date(`${input.paidOn}T12:00:00Z`).toISOString()
      : paid
        ? new Date().toISOString()
        : null;

  const supabase = await createClient();

  // Who is paying whom — derived from the match, not from the form.
  const { data: match } = await supabase
    .from("parent_ticket_matches")
    .select(
      "traveller_listing_id, requester_listing_id, " +
        "traveller:parent_ticket_listings!parent_ticket_matches_traveller_listing_id_fkey(profile_id), " +
        "requester:parent_ticket_listings!parent_ticket_matches_requester_listing_id_fkey(profile_id)"
    )
    .eq("id", input.matchId)
    .maybeSingle<{
      traveller: { profile_id: string } | null;
      requester: { profile_id: string } | null;
    }>();

  if (!match) return { ok: false, error: "Match not found." };

  const row = {
    match_id: input.matchId,
    // The requester's family pays; the traveller is paid.
    payer_profile_id: match.requester?.profile_id ?? null,
    payee_profile_id: match.traveller?.profile_id ?? null,
    gross_amount: gross,
    commission_amount: commission,
    payout_amount: payout,
    payment_status: input.paymentStatus,
    payment_method: input.paymentMethod,
    paid_at: paidAt,
    reference_note: clean(input.referenceNote, 500),
    recorded_by: user.id,
  };

  const existing = await getMatchPayment(input.matchId);

  const { data, error } = existing
    ? await supabase
        .from("parent_ticket_payments")
        .update(row)
        .eq("id", existing.id)
        .select("id, reference_number")
        .single<{ id: string; reference_number: string }>()
    : await supabase
        .from("parent_ticket_payments")
        .insert(row)
        .select("id, reference_number")
        .single<{ id: string; reference_number: string }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save the payment." };
  }
  return { ok: true, data: { id: data.id, reference: data.reference_number } };
}

// ============================================================================
// Contact release (item 6)
// ============================================================================

/**
 * Introduce the two parties.
 *
 * This is the single most consequential write in the feature: after it, each
 * side can read the other's name, email and phone through
 * parent_ticket_match_contact — and there is no taking that back, which is why
 * there is no un-release action anywhere in this file.
 *
 * The preconditions are re-read from the database rather than trusted from the
 * screen, and the same rule is stated once in canReleaseContact so the button's
 * disabled state and this check can never drift apart.
 */
export async function releaseMatchContact(
  matchId: string
): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("parent_ticket_matches")
    .select("traveller_response, requester_response, contact_released")
    .eq("id", matchId)
    .maybeSingle<{
      traveller_response: "pending" | "accepted" | "declined";
      requester_response: "pending" | "accepted" | "declined";
      contact_released: boolean;
    }>();

  if (!match) return { ok: false, error: "Match not found." };

  const payment = await getMatchPayment(matchId);
  const gate = canReleaseContact(match, payment);
  if (!gate.ready) {
    return { ok: false, error: gate.blockedBy ?? "Not ready to release." };
  }

  const { error } = await supabase
    .from("parent_ticket_matches")
    .update({ contact_released: true, contact_released_by: user.id })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Both parties' contact details for a released match.
 *
 * Goes through the SECURITY DEFINER RPC rather than reading the tables,
 * because the RPC is where the two gates live — released, and the caller is a
 * party (or an admin). Calling it from an ordinary session is safe by
 * construction: it answers nothing to anyone else.
 */
export async function getReleasedContact(
  matchId: string
): Promise<DataResult<ReleasedContact[]>> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(MATCH_CONTACT_RPC, {
    p_match_id: matchId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as ReleasedContact[] };
}

// ============================================================================
// The payment records screen (item 8)
// ============================================================================

export type PaymentRow = ParentTicketPayment & {
  match: {
    id: string;
    reference_number: string;
    match_status: string;
    contact_released: boolean;
  } | null;
};

const PAYMENT_COLUMNS =
  "*, match:parent_ticket_matches!parent_ticket_payments_match_id_fkey(id, reference_number, match_status, contact_released)";

export async function listPayments(): Promise<PaymentRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_payments")
    .select(PAYMENT_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<PaymentRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Money not yet in — the sidebar's warm figure. Fails open to 0. */
export async function countUnsettledPayments(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("parent_ticket_payments")
      .select("id", { count: "exact", head: true })
      .in("payment_status", ["unpaid", "pending"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
