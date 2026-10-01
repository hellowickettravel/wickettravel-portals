"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable, isUuid } from "@/lib/db/errors";
import {
  validateOption,
  type BoardOption,
  type BoardOptionInput,
} from "@/lib/parent-assist-options";

/**
 * Parent Travel Assist board options — admin-only server actions behind
 * /admin/parents-options. Every action re-checks the caller is an admin, and
 * the table is admin-only in RLS (migration 0027), so this is enforced twice.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const SETUP_ERROR = "Run migration 0027_parent_assist_options.sql in Supabase first.";

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
  return { user, profile };
}

const COLUMNS = "id, kind, value, label, region, sort_order, is_active, updated_at";

export async function getBoardOptions(): Promise<{
  rows: BoardOption[];
  needsSetup: boolean;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_assist_options")
    .select(COLUMNS)
    .order("kind")
    .order("sort_order")
    .order("value");
  if (error) {
    if (isMissingTable(error)) return { rows: [], needsSetup: true };
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as BoardOption[], needsSetup: false };
}

export async function saveBoardOption(input: BoardOptionInput): Promise<ActionResult> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Only an admin can change board options." };

  const checked = validateOption(input);
  if (!checked.ok) return checked;

  const supabase = await createClient();
  const row = { ...checked.value, updated_at: new Date().toISOString() };

  const { error } = input.id
    ? isUuid(input.id)
      ? await supabase.from("parent_assist_options").update(row).eq("id", input.id)
      : { error: { message: "That option no longer exists." } as { message: string; code?: string } }
    : await supabase.from("parent_assist_options").insert(row);

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: SETUP_ERROR };
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: `“${row.value}” is already on this list.` };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Show or hide an option on the website without losing it. */
export async function setBoardOptionActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Only an admin can change board options." };
  if (!isUuid(id)) return { ok: false, error: "That option no longer exists." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_assist_options")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: isMissingTable(error) ? SETUP_ERROR : error.message };
  return { ok: true };
}

export async function deleteBoardOption(id: string): Promise<ActionResult> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Only an admin can change board options." };
  if (!isUuid(id)) return { ok: false, error: "That option no longer exists." };

  const supabase = await createClient();
  const { error } = await supabase.from("parent_assist_options").delete().eq("id", id);
  if (error) return { ok: false, error: isMissingTable(error) ? SETUP_ERROR : error.message };
  return { ok: true };
}
