"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, sanitizeLine } from "@/lib/security/limits";

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
