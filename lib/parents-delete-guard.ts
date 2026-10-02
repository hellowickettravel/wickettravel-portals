import "server-only";
import type { createClient } from "@/lib/supabase/server";

/**
 * Deleting a Parent Travel Assist listing or match cascades to the match's
 * payment rows (APPLY_PARENTS_FULLSCOPE_0.sql: matches → listings and
 * payments → matches are both `on delete cascade`). An unpaid or cancelled
 * payment row is just a placeholder, but one where money is pending, was paid
 * or was refunded is a financial record, so those block the delete.
 */
const MONEY_STATUSES = ["pending", "paid", "refunded"] as const;

export const MONEY_BLOCK_MESSAGE =
  "It has a payment that is pending, paid or refunded, so it's kept for your accounts. Cancel the match instead.";

/** True if any of these matches has money pending, paid or refunded. */
export async function matchesHaveMoney(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchIds: string[]
): Promise<{ ok: true; blocked: boolean } | { ok: false; error: string }> {
  if (matchIds.length === 0) return { ok: true, blocked: false };
  const { data, error } = await supabase
    .from("parent_ticket_payments")
    .select("id")
    .in("match_id", matchIds)
    .in("payment_status", [...MONEY_STATUSES])
    .limit(1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, blocked: (data ?? []).length > 0 };
}
