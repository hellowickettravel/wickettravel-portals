import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

/**
 * Profiles / employees access. Reads run as the logged-in user, so RLS decides
 * what actually comes back (see supabase/migrations/0002_rls_policies.sql).
 */

const PROFILE_COLUMNS =
  "id, full_name, email, role, access_level, is_active, created_at";

/** All staff (role = 'employee'). Admin-only in practice via RLS. */
export async function getEmployees(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("role", "employee")
    .order("full_name", { ascending: true })
    .returns<Profile[]>();

  if (error) throw error;
  return data ?? [];
}

/** A single profile by id. */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle<Profile>();

  if (error) throw error;
  return data ?? null;
}
