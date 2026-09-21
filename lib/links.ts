/**
 * The public marketing site — a separate Next.js project on its own Vercel
 * deployment (see lib/security/cors.ts). Mirrors that project's own
 * lib/links.ts, which points PORTAL_LOGIN_URL back at this one.
 */
export const MARKETING_SITE_URL = "https://www.wickettravel.com";

/** The marketing site's real routes are /terms and /privacy — not
 *  /terms-of-service or /privacy-policy, which a couple of pages here still
 *  linked to (a 404 on the other side). */
export const MARKETING_TERMS_URL = `${MARKETING_SITE_URL}/terms`;
export const MARKETING_PRIVACY_URL = `${MARKETING_SITE_URL}/privacy`;
