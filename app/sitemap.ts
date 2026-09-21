import type { MetadataRoute } from "next";

/**
 * The portal is an application, not a content site, so this sitemap is
 * deliberately tiny: it lists only the pages that are meant to be FOUND.
 *
 * /join-as-helper is the one page here with a genuine search job — it
 * explains what a travel companion does and what it pays, to someone who has
 * not heard of us. Everything else is a door into an account (noindex) or
 * behind one (blocked in robots.ts), and a sitemap entry for a page we ask
 * not to index is a contradiction Search Console reports as an error.
 */
const ORIGIN = "https://portal.wickettravel.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${ORIGIN}/join-as-helper`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
