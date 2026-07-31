/**
 * The brand hexes, in TypeScript.
 *
 * `app/globals.css` is the source of truth for the design system. Anything that
 * renders in the browser must consume the CSS tokens — `bg-ocean`, `text-flame`,
 * `var(--ocean-deep)` — and never import from here.
 *
 * This module exists for the handful of places that cannot reach a CSS
 * variable: hex shown to a user as literal copy, canvas/PDF output, and
 * outbound email. Keep it in step with `:root` in globals.css.
 */
export const BRAND = {
  /** --ocean · the structure, and the strong secondary action */
  ocean: "#0F4C81",
  /** --flame · the primary action, one per view */
  flame: "#D24417",
} as const;
