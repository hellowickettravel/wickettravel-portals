import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Single definition, re-exported for the many call sites that import it from
// here. It used to be declared in both files and they had already drifted —
// adding 'helper' in one place left the other silently narrower.
export type { UserRole } from "@/lib/db/types";
// The role → portal map lives with the role type so client components (the
// login form) can import it without pulling in next/headers.
export { roleDashboardPath } from "@/lib/db/types";
import type { UserRole } from "@/lib/db/types";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  access_level: string | null;
  is_active: boolean | null;
};

export type AuthResult = {
  user: User | null;
  profile: Profile | null;
};


/**
 * Server-side helper. Returns the current authenticated user together with
 * their profile row (role / access_level / full_name). If nobody is logged in,
 * both fields are null.
 */
export async function getUserAndProfile(): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, access_level, is_active")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile: profile ?? null };
}

/**
 * True when the profile belongs to a deactivated account. A null/missing
 * is_active is treated as ACTIVE (only an explicit `false` blocks access), so
 * legacy rows created before is_active existed don't get locked out.
 */
export function isDeactivated(profile: Profile | null): boolean {
  return profile?.is_active === false;
}
