/**
 * The brand hexes, in TypeScript.
 *
 * `app/globals.css` is the source of truth for the design system. Anything that
 * renders in the browser must consume the CSS tokens — `bg-ocean`, `text-coral`,
 * `var(--ocean-deep)` — and never import from here.
 *
 * This module exists for the handful of places that cannot reach a CSS
 * variable: hex shown to a user as literal copy, canvas/PDF output, and
 * outbound email. Keep it in step with `:root` in globals.css.
 */
export const BRAND = {
  /** --ocean · the everyday action */
  ocean: "#0F4C81",
  /** --coral-deep · the one accent per view */
  coral: "#C0451F",
} as const;
