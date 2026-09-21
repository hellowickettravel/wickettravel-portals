import type { MetadataRoute } from "next";

/**
 * The portal had NO robots.txt at all — a 404, which Google reads as
 * "crawl everything". /login, /signup and /customer/book were all returning
 * 200 to a crawler with no meta robots and no X-Robots-Tag, so the sign-in
 * screen was free to rank for the brand name and compete with the real site.
 *
 * Two different tools for two different jobs, and they are not
 * interchangeable:
 *
 *   robots.txt (here)  stops the CRAWL. It does NOT stop indexing — Google
 *                      can still list a blocked URL it finds linked
 *                      elsewhere, showing a bare title and no description.
 *   noindex (metadata) stops the INDEX, but only on a page Google is
 *                      ALLOWED to crawl, because it has to read the tag.
 *
 * So the application areas, which no one should ever reach from a search
 * result and which cost crawl budget to walk, are blocked here. The public
 * doors — /login, /signup, /join-as-helper — stay crawlable and carry their
 * own `noindex` (or, for the helper landing page, deliberately don't).
 */
const APP_AREAS = [
  "/admin/",
  "/employee/",
  "/helper/",
  "/customer/",
  "/api/",
  "/auth/",
  "/reset-password",
  "/forgot-password",
];

/**
 * Carved back out of the block above, because the PUBLIC homepage's search
 * widget links straight here. A URL that is linked from an indexable page
 * but blocked in robots.txt is the classic way to earn Search Console's
 * "Indexed, though blocked by robots.txt" warning: Google sees the link,
 * never fetches the page, and so never reads the `noindex` that would have
 * settled it. Letting it crawl is what lets the noindex do its job.
 *
 * Google honours the most specific matching rule, so this beats
 * "/customer/" for this one path and nothing else under it.
 */
const CRAWLABLE_EXCEPTIONS = ["/customer/book"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...CRAWLABLE_EXCEPTIONS],
      disallow: APP_AREAS,
    },
    // The canonical host for this property, so a crawler that finds the
    // Vercel deployment URL knows which one is real.
    host: "https://portal.wickettravel.com",
  };
}
