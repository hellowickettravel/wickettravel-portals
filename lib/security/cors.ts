/**
 * Who may call the public API from a browser.
 *
 * The three public endpoints (/api/parent-ticket, /api/parent-ticket/public,
 * /api/visa-enquiry) each carried their own copy of this list, which meant
 * adding a domain was three edits and forgetting one was a silent, browser-only
 * failure. One list, one helper, one place to change.
 *
 * What CORS is and isn't doing here: it governs BROWSERS, so it is what stops
 * someone else's web page posting leads as your visitor. It is not the security
 * boundary for the endpoints themselves — those validate every field server-side
 * and rate-limit by real client IP regardless of origin, because curl doesn't
 * send a preflight.
 */

/**
 * The homepage deploys from a DIFFERENT Vercel account to this portal, so its
 * preview URLs aren't predictable from here. HOMEPAGE_ORIGINS lets an origin be
 * added from the Vercel dashboard without a code change: comma-separated, full
 * origins ("https://staging.wickettravel.com"). Anything unparseable is dropped
 * rather than trusted, so a typo narrows the list instead of widening it.
 */
function fromEnv(): string[] {
  const raw = process.env.HOMEPAGE_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => {
      try {
        const url = new URL(entry.trim());
        return url.protocol === "https:" || url.protocol === "http:"
          ? url.origin
          : null;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => origin !== null);
}

const ALLOWED_ORIGINS = new Set([
  // The live public homepage. The apex 308-redirects to www, so www is the
  // origin a browser actually sends — but the apex is listed too in case it is
  // ever served directly.
  "https://www.wickettravel.com",
  "https://wickettravel.com",
  // The homepage's Vercel deployment URL, still serving the same site.
  "https://wicket-travel.vercel.app",
  // Local homepage development.
  "http://localhost:3000",
  "http://localhost:3100",
  "http://127.0.0.1:3000",
  ...fromEnv(),
]);

/** True when this Origin header may read our responses. */
export function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

/**
 * CORS headers for a public endpoint. `Vary: Origin` is always sent so a
 * disallowed origin's empty response is never cached and served to an allowed
 * one; the permissive headers appear only for origins on the list.
 */
export function corsHeaders(
  origin: string | null,
  method: "POST" | "GET"
): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin!;
    headers["Access-Control-Allow-Methods"] = `${method}, OPTIONS`;
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}
