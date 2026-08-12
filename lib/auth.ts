import { cache } from "react";
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

/**
 * The narrow session profile — deliberately NOT `db/types.ts`'s full `Profile`.
 * This is read on every authenticated request, so it carries only what the
 * shells and guards need. Anything else is fetched by the screen that wants it.
 */
export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  access_level: string | null;
  is_active: boolean | null;
  /**
   * The person's own picture. Here rather than fetched per-screen because the
   * top bar renders it on every single page, so a second query would be a
   * round trip on every navigation. Optional: the column arrives with
   * APPLY_ADMIN_ROUND3.sql, and the select below tolerates its absence.
   */
  avatar_url?: string | null;
};

export type AuthResult = {
  user: User | null;
  profile: Profile | null;
};


/**
 * Server-side helper. Returns the current authenticated user together with
 * their profile row (role / access_level / full_name). If nobody is logged in,
 * both fields are null.
 *
 * ## Wrapped in React `cache()`, and that is the single biggest speed fix here
 *
 * This function costs TWO SEQUENTIAL network round trips: `auth.getUser()`
 * calls the Supabase Auth server to validate the JWT, and only once that
 * returns do we know the id to select the profile with. Measured from the
 * app server, one Supabase round trip is ~180ms — so ~360ms per call.
 *
 * It is called from 138 places: the layout, the page, and every one of the
 * ~120 server actions guards with it. Rendering `/admin/orders` used to run it
 * at least twice before any data was fetched, which is ~720ms of the ~800ms
 * TTFB doing nothing but re-asking who the caller is.
 *
 * `cache()` memoises per REQUEST (not across requests, and not across users) —
 * it is React's own request-scoped cache, torn down when the request ends. So
 * the answer is fetched once and every subsequent guard in the same render or
 * the same action reuses it. No behaviour changes: the same code still runs,
 * it just stops asking the same question five times.
 *
 * It is emphatically NOT a session cache. A new request re-validates the JWT
 * against Supabase exactly as before, so a revoked or expired session is still
 * caught on the very next navigation.
 */
export const getUserAndProfile = cache(
  async function getUserAndProfile(): Promise<AuthResult> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const COLUMNS = "id, full_name, role, access_level, is_active";
    // Ask for avatar_url, and fall back to the base columns if the database
    // hasn't had APPLY_ADMIN_ROUND3.sql run yet. Every authenticated request
    // goes through here, so it must not be able to fail on a missing column.
    let { data: profile } = await supabase
      .from("profiles")
      .select(`${COLUMNS}, avatar_url`)
      .eq("id", user.id)
      .maybeSingle<Profile>();

    if (!profile) {
      ({ data: profile } = await supabase
        .from("profiles")
        .select(COLUMNS)
        .eq("id", user.id)
        .maybeSingle<Profile>());
    }

    return { user, profile: profile ?? null };
  }
);

/**
 * True when the profile belongs to a deactivated account. A null/missing
 * is_active is treated as ACTIVE (only an explicit `false` blocks access), so
 * legacy rows created before is_active existed don't get locked out.
 */
export function isDeactivated(profile: Profile | null): boolean {
  return profile?.is_active === false;
}
