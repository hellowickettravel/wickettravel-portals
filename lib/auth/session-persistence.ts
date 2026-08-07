/**
 * "Keep me signed in" — the sign-in screen's persistence choice.
 *
 * Supabase's SSR client always writes its auth cookies with a 400-day Max-Age
 * (it hard-codes that value when it sets them, so `cookieOptions` can't change
 * it). To honour an unticked "Keep me signed in" we therefore rewrite those
 * cookies as *session* cookies — same name, same value, no Max-Age — so the
 * browser drops them when it closes. The cookies are not httpOnly by design in
 * @supabase/ssr, so this is a supported client-side rewrite.
 *
 * A marker cookie records the choice. It is itself a session cookie, so it
 * disappears at exactly the same moment the auth cookies do, and a token
 * refresh (which re-writes the auth cookies with the long Max-Age) can be
 * re-downgraded for as long as the choice is in force.
 */

const MARKER = "wt-session-only";

function isAuthCookieName(name: string) {
  // sb-<project-ref>-auth-token, plus its .0/.1 chunks when the JWT is large.
  return name.startsWith("sb-") && name.includes("-auth-token");
}

/** Re-set every Supabase auth cookie without a Max-Age. Safe to call often. */
export function downgradeAuthCookiesToSession() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";

  for (const pair of document.cookie.split("; ")) {
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const name = pair.slice(0, eq);
    if (!isAuthCookieName(name)) continue;
    const value = pair.slice(eq + 1);
    document.cookie = `${name}=${value}; path=/; samesite=lax${secure}`;
  }
}

/** Whether the user asked us NOT to keep them signed in past this browser session. */
export function isSessionOnly() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${MARKER}=1`));
}

/**
 * Record the choice made on the sign-in form and apply it immediately.
 * `keepSignedIn === false` downgrades the freshly-written auth cookies.
 */
export function setKeepSignedIn(keepSignedIn: boolean) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";

  if (keepSignedIn) {
    document.cookie = `${MARKER}=; path=/; max-age=0${secure}`;
    return;
  }

  document.cookie = `${MARKER}=1; path=/; samesite=lax${secure}`;
  downgradeAuthCookiesToSession();
}
