"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, sanitizeLine } from "@/lib/security/limits";
import { isMissingColumn } from "@/lib/db/errors";

/** Self-service account actions available to any signed-in role. */

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Update my own display name. RLS (profiles_update_own) plus the column guard
 * trigger allow a non-admin to change full_name on their own row.
 */
export async function updateMyName(fullName: string): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const name = sanitizeLine(fullName, LIMITS.FULL_NAME);
  if (!name) return { ok: false, error: "Name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Set (or clear, with null) my own profile picture.
 *
 * This is the PERSONAL avatar, and nothing else. It shows on the account
 * button in the top bar, on my rows in the inbox and on my chat bubbles. It is
 * explicitly NOT the sidebar mark: that is `business_settings.logo_url`, set
 * once by an admin for the whole company, and the two must stay unconnected —
 * a member of staff changing their photo must never change the product's
 * branding for everyone else.
 *
 * Fails soft on a database without `profiles.avatar_url` (it arrives with
 * APPLY_ADMIN_ROUND3.sql), so the rest of the settings screen still works.
 */
export async function updateMyAvatar(
  avatarUrl: string | null
): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) {
    return { ok: false, error: "That doesn't look like an uploaded image." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    if (isMissingColumn(error)) {
      return {
        ok: false,
        error:
          "Profile pictures aren't enabled on this database yet — run APPLY_ADMIN_ROUND3.sql.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** My own profile picture URL, or null. Never throws. */
export async function getMyAvatar(): Promise<string | null> {
  const { user } = await getUserAndProfile();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ avatar_url: string | null }>();
  if (error) return null;
  return data?.avatar_url ?? null;
}
