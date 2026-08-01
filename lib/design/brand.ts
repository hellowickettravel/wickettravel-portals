/**
 * The brand hexes, in TypeScript.
 *
 * `app/globals.css` is the source of truth for the design system. Anything that
 * renders in the browser must consume the CSS tokens — `bg-marine`, `text-coral`,
 * `var(--marine-deep)` — and never import from here.
 *
 * This module exists for the handful of places that cannot reach a CSS
 * variable: hex shown to a user as literal copy, canvas/PDF output, and
 * outbound email. Keep it in step with `:root` in globals.css.
 */
export const BRAND = {
  /** --marine · the structure: rail, links, the strong secondary action */
  marine: "#12628F",
  /** --coral · the primary action, one per view. The accessible fill. */
  coral: "#C4401C",
  /** --coral-vivid · the brand orange for graphics only — dots, edge bars,
   *  chart marks, logo. Fails AA under small text; never use it as a fill
   *  behind a label. */
  coralVivid: "#E2542C",
} as const;
