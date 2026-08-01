/**
 * The artwork behind the marine auth panel — design system v4 §16.
 *
 * Oversized boarding-pass, passport-stamp and baggage-tag line drawings,
 * cropped and rotated so they bleed off the panel edges. Drawn rather than
 * photographed: no licence, no image request, no blur at any viewport, and
 * it says "ticketing" specifically rather than "travel" generally.
 *
 * Everything is a stroke at very low opacity. The rule that keeps this
 * legible is that no shape is allowed into the centre-left band where the
 * headline and the proof list live — the art frames the text, it never
 * runs underneath it.
 *
 * `slice` crops rather than squashes, so the strokes keep their weight and
 * the composition re-frames instead of distorting on a tall viewport.
 */
export function BoardingPassArt() {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 600 820"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* ── Boarding pass, top-right, tilted off the corner ── */}
      <g opacity="0.1" transform="translate(214 -66) rotate(-11)">
        <rect x="0" y="0" width="470" height="176" rx="12" />
        {/* Perforation between body and stub */}
        <path d="M348 0 V176" strokeDasharray="7 8" opacity="0.75" />
        {/* Airline / flight line */}
        <path d="M28 36 H132" opacity="0.55" />
        <path d="M262 36 H320" opacity="0.55" />
        {/* Route: LHR ✈ DXB, as a rule with a plane riding it */}
        <path d="M28 92 H120" strokeWidth="6" opacity="0.8" />
        <path d="M140 92 H222" strokeDasharray="3 7" opacity="0.6" />
        <path d="M246 84 l22 8 -22 8 5-8 z" fill="currentColor" stroke="none" opacity="0.75" />
        <path d="M288 92 H320" strokeDasharray="3 7" opacity="0.6" />
        <path d="M28 132 H96" opacity="0.4" />
        <path d="M118 132 H196" opacity="0.4" />
        {/* Stub */}
        <path d="M372 36 H436" opacity="0.55" />
        <path d="M372 76 H422" strokeWidth="6" opacity="0.8" />
        <path d="M372 112 H446" opacity="0.4" />
        <path d="M372 136 H414" opacity="0.4" />
      </g>

      {/* ── Passport stamp, low right ── */}
      <g opacity="0.09" transform="translate(432 604) rotate(-14)">
        <circle cx="0" cy="0" r="104" strokeDasharray="10 9" />
        <circle cx="0" cy="0" r="82" />
        <path d="M-46 -12 H46" opacity="0.6" />
        <path d="M-34 22 H34" opacity="0.45" />
        {/* Little plane inside the stamp */}
        <path
          d="M-30 -40 L34 -40 M22 -52 l14 12 -14 12"
          opacity="0.7"
        />
      </g>

      {/* ── Baggage tag, low left, hanging on its loop ── */}
      <g opacity="0.085" transform="translate(-38 528) rotate(9)">
        <rect x="0" y="0" width="150" height="238" rx="12" />
        <circle cx="75" cy="30" r="9" />
        <path d="M18 76 H132" strokeWidth="6" opacity="0.75" />
        <path d="M18 112 H108" opacity="0.5" />
        <path d="M18 138 H124" opacity="0.5" />
        {/* Barcode */}
        <g opacity="0.65">
          <path d="M22 176 V214" strokeWidth="4" />
          <path d="M36 176 V214" strokeWidth="2" />
          <path d="M46 176 V214" strokeWidth="5" />
          <path d="M60 176 V214" strokeWidth="2" />
          <path d="M70 176 V214" strokeWidth="3" />
          <path d="M82 176 V214" strokeWidth="5" />
          <path d="M96 176 V214" strokeWidth="2" />
          <path d="M106 176 V214" strokeWidth="4" />
          <path d="M120 176 V214" strokeWidth="2" />
        </g>
      </g>

      {/* ── A single flight arc tying the three together, kept high and to
             the right so it never crosses the headline ── */}
      <g opacity="0.11">
        <path
          d="M366 250 C 452 268, 520 322, 556 404"
          strokeDasharray="2 9"
        />
        <circle cx="366" cy="250" r="4.5" fill="currentColor" stroke="none" />
        <circle cx="556" cy="404" r="4.5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
