import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/lib/db/types";

/**
 * Server-side notification delivery for the Parents Tickets marketplace.
 *
 * Everything else in the product notifies through Postgres triggers (0009,
 * 0012, 0020). The marketplace notifies from TypeScript instead, for one
 * practical reason: the events that matter here are decisions a human makes in
 * a server action — approving a listing, proposing a match, releasing an
 * introduction — and the action already knows who to tell and what to say. A
 * trigger would have to re-derive both from the row diff, and would need a
 * migration for every new message.
 *
 * The insert uses the SERVICE ROLE because the recipient is by definition
 * someone other than the caller, and notifications' RLS only lets a person
 * read their own. Delivery is BEST-EFFORT: a failed notification must never
 * roll back the thing it was announcing. Someone finding out late is a much
 * smaller problem than an approval that silently didn't happen.
 */

/** Where this person's Parents Tickets area lives, by role. */
async function basePathFor(profileId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle<{ role: string }>();
    return data?.role === "helper" ? "/helper" : "/customer/parents";
  } catch {
    return "/customer/parents";
  }
}

export type NotifyInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Absolute path. Omit and one is derived from the recipient's portal. */
  link?: string | null;
  /** Who did it. Null reads as "Wicket" in the UI, which is right for system acts. */
  actorId?: string | null;
  actorName?: string | null;
};

/** Deliver one notification. Never throws. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      recipient_id: input.recipientId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body ? input.body.slice(0, 500) : null,
      link: input.link ?? (await basePathFor(input.recipientId)),
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
    });
  } catch {
    /* best effort — see the note above */
  }
}

/** Deliver the same notification to several people, in parallel. */
export async function notifyAll(inputs: NotifyInput[]): Promise<void> {
  await Promise.all(inputs.map(notify));
}

/**
 * Every admin, for events the business needs to see rather than a single
 * person — a listing arriving for review, a party answering a match.
 */
export async function notifyAdmins(
  input: Omit<NotifyInput, "recipientId">
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true)
      .returns<{ id: string }[]>();
    await notifyAll(
      (data ?? []).map((a) => ({ ...input, recipientId: a.id }))
    );
  } catch {
    /* best effort */
  }
}
