import { cn } from "@/lib/utils";

/**
 * The Wicket Travel mark and lockup, built from the Claude Design
 * **"Logo System"** file (sections 02, 03, 06, 08, 09).
 *
 * ## The mark is the letter
 *
 * The logo is a single continuous stroked path — one unbroken line that folds
 * into a W — with a filled dot resting on its opening vertex. In the lockup it
 * is not an icon sitting *beside* the name: it **is** the W of "Wicket", and
 * the text that follows is literally `icket Travel`. That is why the SVG is
 * `display: inline-block` on the baseline with an em-relative height rather
 * than a flex sibling — it has to scale and sit with the type it belongs to.
 *
 * ## Three tiers, and they are not the same drawing
 *
 * The design gives the wordmark three sizes, and the small one is a genuinely
 * different construction: a heavier stroke (13.5 vs 10.5), a bigger dot (r9 vs
 * r7) and a WIDER viewBox to give that thicker stroke room, or the round caps
 * clip against the box. Reproducing this by scaling the large mark down would
 * lose the stroke at ~12px, which is exactly what the extra tier exists to
 * prevent. Do not collapse them.
 *
 * | tier      | type size | weight | tracking  | stroke | dot | viewBox                |
 * |-----------|-----------|--------|-----------|--------|-----|------------------------|
 * | `full`    | >= 24px   | 600    | -0.022em  | 10.5   | 7   | `6 15.75 84.25 67.5`   |
 * | `compact` | 14-23px   | 500    | -0.006em  | 10.5   | 7   | `6 15.75 84.25 67.5`   |
 * | `min`     | 12.5px    | 500    | 0.002em   | 13.5   | 9   | `4 14.25 87.75 70.5`   |
 *
 * The stroke is `currentColor` throughout, so a lockup inherits the colour of
 * whatever it sits on — white on the navy sidebar, ink on the light top bar —
 * from one component. Only the dot is fixed: it is always ember.
 */

type Tier = "full" | "compact" | "min";

const TIERS = {
  full: {
    viewBox: "6 15.75 84.25 67.5",
    stroke: 10.5,
    dot: 7,
    height: "0.70em",
    width: "0.8737em",
    top: "0.012em",
    gap: "0.010em",
    weight: 600,
    tracking: "-0.022em",
  },
  compact: {
    viewBox: "6 15.75 84.25 67.5",
    stroke: 10.5,
    dot: 7,
    height: "0.78em",
    width: "0.9736em",
    top: "0.012em",
    gap: "0.046em",
    weight: 500,
    tracking: "-0.006em",
  },
  min: {
    viewBox: "4 14.25 87.75 70.5",
    stroke: 13.5,
    dot: 9,
    height: "0.86em",
    width: "1.0704em",
    top: "0.014em",
    gap: "0.06em",
    weight: 500,
    tracking: "0.002em",
  },
} as const satisfies Record<Tier, Record<string, string | number>>;

/** The design's own path. These numbers ARE the drawing — never redraw it. */
const MARK_PATH = "M13 30L33 78L50 42L67 78L85 21";

/**
 * The mark on its own — no wordmark. Used inside the round avatar chip, the app
 * icon and the favicon.
 *
 * `size` is the mark's HEIGHT in px; the width follows the viewBox's aspect
 * ratio so the glyph is never distorted. Below 20px it switches to the heavy
 * `min` construction automatically, for the reason in the block comment above.
 */
export function WicketMark({
  size = 24,
  tier,
  className,
}: {
  size?: number;
  tier?: Tier;
  className?: string;
}) {
  const t = TIERS[tier ?? (size < 20 ? "min" : "full")];
  const [, , vbw, vbh] = t.viewBox.split(" ").map(Number);
  return (
    <svg
      viewBox={t.viewBox}
      width={(size * vbw) / vbh}
      height={size}
      className={cn("block flex-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={MARK_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={t.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="30" r={t.dot} fill="var(--color-logo-dot)" />
    </svg>
  );
}

/**
 * The full lockup: mark-as-W plus `icket Travel`.
 *
 * Renders as a single inline run of Poppins text, so it can be dropped
 * anywhere type is allowed and it will sit on the baseline correctly. Colour
 * comes from `currentColor` — set it on the parent.
 */
export function WicketWordmark({
  size = 16,
  tier,
  className,
}: {
  /** Type size in px. Picks the tier if one isn't named. */
  size?: number;
  tier?: Tier;
  className?: string;
}) {
  const key: Tier = tier ?? (size >= 24 ? "full" : size >= 14 ? "compact" : "min");
  const t = TIERS[key];
  return (
    <span
      className={cn("font-poppins inline-block whitespace-nowrap", className)}
      style={{
        fontSize: size,
        fontWeight: t.weight,
        letterSpacing: t.tracking,
        lineHeight: 1,
      }}
    >
      {/* The visible run spells "icket Travel" because the mark supplies the
          W. A screen reader must not read that, so the whole lockup is hidden
          from the accessibility tree and the real name is given once here. */}
      <span className="sr-only">Wicket Travel</span>
      <span aria-hidden="true">
      <svg
        viewBox={t.viewBox}
        style={{
          height: t.height,
          width: t.width,
          display: "inline-block",
          verticalAlign: "baseline",
          position: "relative",
          top: t.top,
          marginRight: t.gap,
        }}
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={MARK_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={t.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="13" cy="30" r={t.dot} fill="var(--color-logo-dot)" />
      </svg>
      {/* Not a typo: the mark above is the W. */}
      icket Travel
      </span>
    </span>
  );
}
