"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tooManyRecentRows } from "@/lib/security/rate-limit";
import { notify } from "@/lib/notify";

/**
 * The thread on a Parents Tickets match.
 *
 * Before this, an introduction handed both people an email address and the
 * conversation left the building — so the family and the helper had no record
 * of what was agreed, and Wicket lost sight of an arrangement it had brokered
 * and is accountable for.
 *
 * THE GATE IS THE DATABASE'S, NOT THIS FILE'S. The insert policy in
 * APPLY_PARENTS_MESSAGES.sql requires `contact_released = true`, and the guard
 * trigger overwrites sender_id with auth.uid(). The checks here exist to give
 * a readable error instead of an RLS rejection — they are not the protection.
 */

const MAX_BODY = 4000;

type ActionResult = { ok: true } | { ok: false; error: string };

export type MatchMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { full_name: string | null; role: string } | null;
};

const COLUMNS =
  "id, match_id, sender_id, body, created_at, sender:profiles!parent_ticket_messages_sender_id_fkey(full_name, role)";

/**
 * The thread, oldest first.
 *
 * Returns [] rather than throwing when the table isn't there yet, so a portal
 * whose SQL hasn't been run still renders — the same fail-soft the lead bridge
 * uses. Every other error is real and surfaces.
 */
export async function listMatchMessages(
  matchId: string
): Promise<MatchMessage[]> {
  const { user } = await getUserAndProfile();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_messages")
    .select(COLUMNS)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .returns<MatchMessage[]>();

  // PGRST205 = the table isn't in the schema cache, i.e. not applied yet.
  if (error) {
    if (error.code === "PGRST205") return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Post to the thread.
 *
 * Rate-limited per person per match: a chat is the one surface where a script
 * can generate unbounded rows, and the ceiling is high enough that two people
 * arranging a trip never meet it.
 */
export async function sendMatchMessage(input: {
  matchId: string;
  body: string;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Not signed in." };

  const body = input.body
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_BODY);
  if (!body) return { ok: false, error: "Write something first." };

  const supabase = await createClient();

  // Read the match to say WHY it's closed, and to know who to notify. RLS
  // already scopes this to a match the caller is party to (or admin).
  const { data: match } = await supabase
    .from("parent_ticket_matches")
    .select(
      "id, contact_released, " +
        "traveller:parent_ticket_listings!parent_ticket_matches_traveller_listing_id_fkey(profile_id), " +
        "requester:parent_ticket_listings!parent_ticket_matches_requester_listing_id_fkey(profile_id)"
    )
    .eq("id", input.matchId)
    .maybeSingle<{
      id: string;
      contact_released: boolean;
      traveller: { profile_id: string } | null;
      requester: { profile_id: string } | null;
    }>();

  if (!match) return { ok: false, error: "That match isn't yours." };
  if (!match.contact_released) {
    return {
      ok: false,
      error: "The thread opens once we've introduced you both.",
    };
  }

  if (
    await tooManyRecentRows({
      table: "parent_ticket_messages",
      column: "sender_id",
      value: user.id,
      windowSec: 60 * 5,
      max: 60,
    })
  ) {
    return { ok: false, error: "Slow down a moment — try again shortly." };
  }

  const { error } = await supabase
    .from("parent_ticket_messages")
    // sender_id is sent for clarity but the guard trigger overwrites it with
    // auth.uid(); a forged value simply becomes the caller's own.
    .insert({ match_id: input.matchId, sender_id: user.id, body });

  if (error) {
    if (error.code === "PGRST205") {
      return {
        ok: false,
        error: "Messaging isn't switched on yet — run APPLY_PARENTS_MESSAGES.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  // Tell the other side. An admin posting notifies both; a party notifies
  // their counterpart only.
  const parties = [
    match.traveller?.profile_id,
    match.requester?.profile_id,
  ].filter((id): id is string => !!id && id !== user.id);

  await Promise.all(
    parties.map((recipientId) =>
      notify({
        recipientId,
        type: "new_message",
        title:
          profile?.role === "admin"
            ? "Wicket replied on your match"
            : "You have a new message",
        body: body.slice(0, 140),
        actorId: user.id,
        actorName: profile?.full_name ?? null,
      })
    )
  );

  return { ok: true };
}
