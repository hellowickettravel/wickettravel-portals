import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTable } from "@/lib/db/errors";

/**
 * Per-person read receipts for the staff inbox.
 *
 * The admin inbox has never had one. Its badge counts customer messages that
 * have arrived since the team last *replied* — a business fact, not a read
 * state — so there was no way to say "I have seen this" without answering it,
 * and the badge kept counting threads that had already been dealt with
 * elsewhere. `assignments.last_read_at` solves this for employees, but an
 * admin holds no assignment row, so it cannot be reused.
 *
 * `conversation_reads` is one row per (user, conversation). It arrives with
 * APPLY_ADMIN_ROUND3.sql; every function here degrades to "nobody has read
 * anything", which lands the inbox back on exactly the behaviour it has today.
 *
 * Service role, because the row belongs to the caller and is keyed by their
 * own id — there is nothing here another user could read even if RLS were
 * absent, and the read runs on a hot path (every inbox poll).
 */

let tableExists: boolean | null = null;

/** Last-read timestamp per conversation for one person. Empty if unsupported. */
export async function getConversationReads(
  userId: string
): Promise<Map<string, string>> {
  if (tableExists === false) return new Map();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)
      .returns<{ conversation_id: string; last_read_at: string }[]>();

    if (error) {
      if (isMissingTable(error)) tableExists = false;
      return new Map();
    }
    tableExists = true;
    return new Map((data ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  } catch {
    return new Map();
  }
}

/** Stamp one conversation as read up to now. Returns false if unsupported. */
export async function setConversationRead(
  userId: string,
  conversationId: string
): Promise<boolean> {
  if (tableExists === false) return false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("conversation_reads").upsert(
      {
        user_id: userId,
        conversation_id: conversationId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,conversation_id" }
    );
    if (error) {
      if (isMissingTable(error)) tableExists = false;
      return false;
    }
    tableExists = true;
    return true;
  } catch {
    return false;
  }
}

/** Does this database carry read receipts yet? Drives whether the UI offers them. */
export async function hasConversationReads(): Promise<boolean> {
  if (tableExists !== null) return tableExists;
  await getConversationReads("00000000-0000-0000-0000-000000000000");
  return tableExists ?? false;
}
