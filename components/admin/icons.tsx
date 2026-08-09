/**
 * The Admin Portal design's icon set — a 1:1 port of the `ico()` glyph table in
 * the Claude Design "Admin Portal All Pages" file.
 *
 * The design draws every glyph inline as a 24-box stroke path (no icon
 * library), so the whole portal shares one geometry, one stroke weight and
 * `currentColor`. Every `d`, `cx/cy/r` and `x/y/w/h/rx` below is copied
 * verbatim from the design's own table — do not "tidy" the numbers, they are
 * the drawing.
 *
 * Defaults match the design's signature `ico(name, size = 18, sw = 1.7)`.
 */

export type IconProps = {
  size?: number;
  /** Stroke width override — the design uses 1.7 for chrome, 1.9–2.2 for emphasis. */
  width?: number;
  className?: string;
};

/* ------------------------------------------------------------------ table */

type Node =
  | ["path", { d: string }]
  | ["circle", { cx: number; cy: number; r: number }]
  | ["rect", { x: number; y: number; width: number; height: number; rx: number }];

/** The design's `L` map, verbatim. */
const GLYPHS = {
  dashboard: [
    ["rect", { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.6 }],
    ["rect", { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.6 }],
    ["rect", { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.6 }],
    ["rect", { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.6 }],
  ],
  orders: [
    ["path", { d: "M5.5 8h13l-1 11.4a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4L5.5 8z" }],
    ["path", { d: "M9 8V6.5a3 3 0 0 1 6 0V8" }],
  ],
  visa: [
    ["path", { d: "M6.5 3.5h7l4 4v12.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" }],
    ["path", { d: "M13 3.5V8h4" }],
    ["path", { d: "M9 12h6M9 15.5h4" }],
  ],
  parents: [
    ["circle", { cx: 8, cy: 8.5, r: 2.3 }],
    ["circle", { cx: 16, cy: 8.5, r: 2.3 }],
    ["path", { d: "M4 18.5c0-2.4 1.8-4 4-4s4 1.6 4 4" }],
    ["path", { d: "M12 18.5c0-2.4 1.8-4 4-4s4 1.6 4 4" }],
  ],
  messages: [
    ["path", { d: "M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.5V15.5H6.5a2 2 0 0 1-2-2v-7z" }],
  ],
  support: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["circle", { cx: 12, cy: 12, r: 3.2 }],
    ["path", { d: "M6.4 6.4l3.3 3.3M14.3 14.3l3.3 3.3M17.6 6.4l-3.3 3.3M9.7 14.3l-3.3 3.3" }],
  ],
  transactions: [
    ["rect", { x: 3.5, y: 6, width: 17, height: 12, rx: 2 }],
    ["path", { d: "M3.5 10h17" }],
    ["path", { d: "M7 14.5h4" }],
  ],
  performance: [
    ["path", { d: "M4.5 4.5v14a1 1 0 0 0 1 1h14" }],
    ["path", { d: "M8 15l3.2-3.8 2.6 1.8L19 7" }],
  ],
  customers: [
    ["circle", { cx: 12, cy: 8.5, r: 3.2 }],
    ["path", { d: "M5.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" }],
  ],
  staff: [
    ["circle", { cx: 9.5, cy: 8.5, r: 2.9 }],
    ["path", { d: "M4 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" }],
    ["path", { d: "M16 6.2a2.8 2.8 0 0 1 0 5.4" }],
    ["path", { d: "M17.5 14.2c1.9.6 3 2.2 3 4.8" }],
  ],
  settings: [
    ["path", { d: "M4 7.5h9" }],
    ["path", { d: "M17 7.5h3" }],
    ["circle", { cx: 15, cy: 7.5, r: 2 }],
    ["path", { d: "M4 16.5h3" }],
    ["path", { d: "M11 16.5h9" }],
    ["circle", { cx: 9, cy: 16.5, r: 2 }],
  ],
  notifications: [
    ["path", { d: "M6.5 10a5.5 5.5 0 0 1 11 0c0 4.5 1.8 5.8 1.8 5.8H4.7S6.5 14.5 6.5 10z" }],
    ["path", { d: "M10 19a2 2 0 0 0 4 0" }],
  ],
  bell: [
    ["path", { d: "M18 8.5a6 6 0 0 0-12 0c0 4.6-1.8 5.9-2.3 6.3a.6.6 0 0 0 .4 1.1h15.8a.6.6 0 0 0 .4-1.1c-.5-.4-2.3-1.7-2.3-6.3z" }],
    ["path", { d: "M10.2 19.4a2 2 0 0 0 3.6 0" }],
  ],
  logout: [
    ["path", { d: "M9 20.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h3" }],
    ["path", { d: "M14.5 16l4-4-4-4" }],
    ["path", { d: "M18.5 12H9.5" }],
  ],
  paperclip: [
    ["path", { d: "M20 11.5l-7.6 7.6a4.2 4.2 0 0 1-6-6l7.7-7.7a2.6 2.6 0 0 1 3.7 3.7l-7.6 7.6a1 1 0 0 1-1.5-1.4l6.9-6.9" }],
  ],
  image: [
    ["rect", { x: 3.5, y: 5, width: 17, height: 14, rx: 2 }],
    ["circle", { cx: 9, cy: 10, r: 1.7 }],
    ["path", { d: "M4.5 17l4.5-4 3.2 2.8L15.5 13l4 4" }],
  ],
  download: [
    ["path", { d: "M12 4v10" }],
    ["path", { d: "M8 11l4 4 4-4" }],
    ["path", { d: "M5 19h14" }],
  ],
  flight: [
    ["path", { d: "M3 13.5l5 .5 3.5 4h2l-2-6 5 .3a2 2 0 0 0 0-4l-5 .3 2-6h-2L8 6.5l-5 .5a2 2 0 0 0 0 6z" }],
  ],
  whatsapp: [
    ["path", { d: "M4 20l1.35-3.9A8 8 0 1 1 8 18.7L4 20z" }],
    ["path", { d: "M9.1 8.4c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.6 1.4c.1.2 0 .4-.1.5l-.5.5c-.1.1-.1.3 0 .5.4.7 1.2 1.5 1.9 1.8.2.1.4.1.5-.1l.5-.5c.1-.2.3-.2.5-.1l1.4.6c.2.1.3.3.3.5v.5c0 .3-.1.5-.4.7-.4.3-1 .5-1.5.4-1.3-.2-2.9-1-4-2.1s-1.9-2.7-2.1-4c-.1-.5 0-1.1.3-1.5z" }],
  ],
  lock: [
    ["rect", { x: 5, y: 10.5, width: 14, height: 9, rx: 2 }],
    ["path", { d: "M8 10.5V8a4 4 0 0 1 8 0v2.5" }],
  ],
  /* Not in the design file. Drawn to the same contract as `lock` — identical
     body, and the shackle is the same arc left un-closed on the right, so the
     pair reads as one state changing rather than two different icons. */
  unlock: [
    ["rect", { x: 5, y: 10.5, width: 14, height: 9, rx: 2 }],
    ["path", { d: "M8 10.5V8a4 4 0 0 1 7.8-1.3" }],
  ],
  triptype: [
    ["path", { d: "M6 9h11l-2.6-2.6" }],
    ["path", { d: "M18 15H7l2.6 2.6" }],
  ],
  seat: [
    ["path", { d: "M8 5.5v6.5h6" }],
    ["path", { d: "M8 12h6a2 2 0 0 1 2 2v4.5" }],
    ["path", { d: "M6 18.5h3.5" }],
  ],
  calendar: [
    ["rect", { x: 4.5, y: 5.5, width: 15, height: 14, rx: 2 }],
    ["path", { d: "M4.5 9.5h15" }],
    ["path", { d: "M8.5 3.5v3M15.5 3.5v3" }],
  ],
  plane: [
    ["path", { d: "M11 3.4c.3-.9 1.7-.9 2 0l.15 5.9 6.2 3.5a1 1 0 0 1 .5.9v.8l-6.85-1.9v3.4l1.9 1.4v.9L12 18.5l-2.9 1.2v-.9l1.9-1.4v-3.4L4.15 15.5v-.8a1 1 0 0 1 .5-.9L10.85 9.3z" }],
  ],
  pin: [
    ["path", { d: "M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" }],
    ["circle", { cx: 12, cy: 11, r: 2.2 }],
  ],
  wallet: [
    ["path", { d: "M4 8a2 2 0 0 1 2-2h11v3" }],
    ["rect", { x: 4, y: 8, width: 16, height: 11, rx: 2 }],
    ["circle", { cx: 16.5, cy: 13.5, r: 1.3 }],
  ],
  route: [
    ["circle", { cx: 6, cy: 6.5, r: 2 }],
    ["circle", { cx: 18, cy: 17.5, r: 2 }],
    ["path", { d: "M6 8.5v3.5a3 3 0 0 0 3 3h6" }],
  ],
  child: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["path", { d: "M9.2 10.5h.01M14.8 10.5h.01" }],
    ["path", { d: "M8.7 14.5a4 4 0 0 0 6.6 0" }],
  ],
  wheelchair: [
    ["circle", { cx: 11, cy: 5.4, r: 1.6 }],
    ["path", { d: "M10 8v5h5l3 5" }],
    ["path", { d: "M15.2 16.6a4.5 4.5 0 1 1-4.9-4.5" }],
  ],
  luggage: [
    ["rect", { x: 6, y: 8, width: 12, height: 11, rx: 2 }],
    ["path", { d: "M9.5 8V6a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 6v2" }],
    ["path", { d: "M10 11.5v4M14 11.5v4" }],
  ],
  phone: [
    ["path", { d: "M6.5 4.5h3l1.5 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.5v3a1.6 1.6 0 0 1-1.7 1.6C10.8 24 3.5 16.7 5 6.2A1.6 1.6 0 0 1 6.5 4.5z" }],
  ],
  mail: [
    ["rect", { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 }],
    ["path", { d: "M4 7l8 6 8-6" }],
  ],
  user: [
    ["circle", { cx: 12, cy: 8.5, r: 3.2 }],
    ["path", { d: "M5.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" }],
  ],
  idcard: [
    ["rect", { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 }],
    ["circle", { cx: 8.5, cy: 11, r: 1.9 }],
    ["path", { d: "M5.8 16c.4-1.6 1.5-2.4 2.7-2.4s2.3.8 2.7 2.4" }],
    ["path", { d: "M14 10h4M14 13h3" }],
  ],
  globe: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["path", { d: "M4 12h16" }],
    ["path", { d: "M12 4c2.4 2.1 3.6 4.9 3.6 8s-1.2 5.9-3.6 8c-2.4-2.1-3.6-4.9-3.6-8S9.6 6.1 12 4z" }],
  ],
  /* Not in the design file — the driver portal has no design of its own, so
     this is drawn to the same contract: 24-box, 1.7 stroke, round caps. */
  car: [
    ["path", { d: "M4.5 16.5v-3.2l1.8-4.4A1.6 1.6 0 0 1 7.8 8h8.4a1.6 1.6 0 0 1 1.5 1l1.8 4.3v3.2" }],
    ["path", { d: "M4.5 13.5h15" }],
    ["circle", { cx: 8, cy: 16.6, r: 1.6 }],
    ["circle", { cx: 16, cy: 16.6, r: 1.6 }],
  ],
  briefcase: [
    ["rect", { x: 3.5, y: 7.5, width: 17, height: 11, rx: 2 }],
    ["path", { d: "M8.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v1.5" }],
    ["path", { d: "M3.5 12.5h17" }],
  ],
  shield: [
    ["path", { d: "M12 3.5l6.5 2.5v5c0 4.2-2.8 7.2-6.5 8.5-3.7-1.3-6.5-4.3-6.5-8.5v-5L12 3.5z" }],
    ["path", { d: "M9.2 11.8l2 2 3.4-3.6" }],
  ],
  percent: [
    ["path", { d: "M6 18L18 6" }],
    ["circle", { cx: 7.5, cy: 7.5, r: 2 }],
    ["circle", { cx: 16.5, cy: 16.5, r: 2 }],
  ],
  home: [
    ["path", { d: "M4.5 11L12 4.5 19.5 11" }],
    ["path", { d: "M6.5 9.5v9h11v-9" }],
    ["path", { d: "M10.5 18.5v-4.5h3v4.5" }],
  ],
  meal: [
    ["path", { d: "M7 3.5v7a2 2 0 0 0 4 0v-7" }],
    ["path", { d: "M9 10.5v10" }],
    ["path", { d: "M16 3.5c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v8" }],
  ],
  building: [
    ["rect", { x: 5, y: 3.5, width: 14, height: 17, rx: 1.5 }],
    ["path", { d: "M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2" }],
    ["path", { d: "M9.5 20.5v-3h5v3" }],
  ],
  file: [
    ["path", { d: "M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" }],
    ["path", { d: "M13.5 3.5V8h4" }],
  ],
  heart: [
    ["path", { d: "M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.7 12 20 12 20z" }],
  ],
  clock: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["path", { d: "M12 7.5V12l3 2" }],
  ],
  chat: [
    ["path", { d: "M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.5V15.5H6.5a2 2 0 0 1-2-2v-7z" }],
  ],
  check: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["path", { d: "M8.5 12l2.4 2.4 4.6-4.8" }],
  ],
  currency: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["path", { d: "M14.5 9.2a3 3 0 0 0-4.5 2.6c0 3.4 4.5 1.4 4.5 4.6a3 3 0 0 1-4.5 2.4" }],
    ["path", { d: "M12 7v1.5M12 15.5V17" }],
  ],
  edit: [
    ["path", { d: "M5 19l3.8-1L18 8.8 15.2 6 6 15.2 5 19z" }],
    ["path", { d: "M14 7l3 3" }],
  ],
  dot: [["circle", { cx: 12, cy: 12, r: 3 }]],
  /* Not in the design's own table — drawn in the same idiom (24 box, round
     caps) for controls the design never had to show. */
  key: [
    ["circle", { cx: 8.5, cy: 12, r: 3.5 }],
    ["path", { d: "M12 12h8M17.5 12v3M20 12v2.5" }],
  ],
  copy: [
    ["rect", { x: 9, y: 9, width: 10.5, height: 10.5, rx: 2 }],
    ["path", { d: "M15 6.5A2 2 0 0 0 13 4.5H6.5a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2" }],
  ],

  /* --- glyphs the design writes inline in its markup rather than in ico() --- */
  search: [
    ["circle", { cx: 11, cy: 11, r: 6.5 }],
    ["path", { d: "M15.8 15.8L20 20" }],
  ],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  tick: [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]],
  close: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  eye: [
    ["path", { d: "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" }],
    ["circle", { cx: 12, cy: 12, r: 2.6 }],
  ],
  export: [["path", { d: "M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18h14" }]],
  downloadAlt: [["path", { d: "M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14" }]],
  upload: [
    ["path", { d: "M12 16V4.5M7.5 9L12 4.5 16.5 9" }],
    ["path", { d: "M5 15.5v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" }],
  ],
  arrowRight: [["path", { d: "M5 12h13M13 6l6 6-6 6" }]],
  refresh: [
    ["path", { d: "M20 11a8 8 0 0 0-14-4.5L4.5 7.5" }],
    ["path", { d: "M4 4.5v3.5h3.5" }],
    ["path", { d: "M4 13a8 8 0 0 0 14 4.5l1.5-1.5" }],
    ["path", { d: "M20 19.5V16h-3.5" }],
  ],
  send: [
    ["path", { d: "M20.5 4L4 10.8l6 2.2 2.2 6L20.5 4z" }],
    ["path", { d: "M10 13l4-4" }],
  ],
  trash: [
    ["path", { d: "M4.5 7h15M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" }],
    ["path", { d: "M6.5 7l.9 12.1a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3L17.5 7" }],
  ],
  warning: [
    ["path", { d: "M12 4.2L2.8 19.5h18.4L12 4.2z" }],
    ["path", { d: "M12 10v4M12 17.2v.1" }],
  ],
  alert: [
    ["circle", { cx: 12, cy: 12, r: 8.5 }],
    ["path", { d: "M12 8v4.5M12 15.6v.1" }],
  ],
  power: [
    ["path", { d: "M12 3.5v8" }],
    ["path", { d: "M6.8 6.8a7 7 0 1 0 10.4 0" }],
  ],
  userPlus: [
    ["circle", { cx: 10, cy: 8.5, r: 3.2 }],
    ["path", { d: "M3.5 19.5c0-3.3 2.9-5.5 6.5-5.5 1.2 0 2.3.2 3.2.6" }],
    ["path", { d: "M17.5 14v6M14.5 17h6" }],
  ],
} satisfies Record<string, Node[]>;

export type IconName = keyof typeof GLYPHS;

/**
 * The design's `ico(name, size, sw)`. Renders the glyph table entry as a
 * 24-box, `currentColor`, round-capped stroke drawing.
 */
export function Ico({
  name,
  size = 18,
  width = 1.7,
  className,
}: IconProps & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flex: "none" }}
    >
      {(GLYPHS[name] as Node[]).map(([tag, attrs], i) =>
        tag === "path" ? (
          <path key={i} {...(attrs as { d: string })} />
        ) : tag === "circle" ? (
          <circle key={i} {...(attrs as { cx: number; cy: number; r: number })} />
        ) : (
          <rect key={i} {...(attrs as { x: number; y: number; width: number; height: number; rx: number })} />
        )
      )}
    </svg>
  );
}

/** Build a named component for one glyph, with the design's own stroke weight. */
function glyph(name: IconName, defaultWidth = 1.7) {
  const C = (p: IconProps) => (
    <Ico name={name} size={p.size} width={p.width ?? defaultWidth} className={p.className} />
  );
  C.displayName = `${name}Icon`;
  return C;
}

/* ---------------------------------------------------------------- chrome */

export const SearchIcon = glyph("search", 1.9);
export const PlusIcon = glyph("plus", 2);
/** The flat ✓ the design uses inside buttons (not the circled `check`). */
export const CheckIcon = glyph("tick", 2);
/** The circled ✓ from the design's `ico("check")` — stepper marks, confirmations. */
export const CheckCircleIcon = glyph("check", 1.9);
export const CloseIcon = glyph("close", 2);
export const EyeIcon = glyph("eye");
export const ExportIcon = glyph("export");
export const DownloadIcon = glyph("download");
/** The longer download arrow the design uses on document rows. */
export const DownloadDocIcon = glyph("downloadAlt", 1.8);
export const UploadIcon = glyph("upload", 1.8);
export const ArrowRightIcon = glyph("arrowRight", 1.8);
export const RefreshIcon = glyph("refresh");
export const SendIcon = glyph("send");
export const TrashIcon = glyph("trash", 1.9);
export const WarningIcon = glyph("warning", 1.9);
export const AlertIcon = glyph("alert", 2);
export const PowerIcon = glyph("power", 1.9);
export const UserPlusIcon = glyph("userPlus");
export const RouteIcon = glyph("route");
export const ChatIcon = glyph("chat");
export const BellIcon = glyph("bell");
export const LifebuoyIcon = glyph("support");
export const SignOutIcon = glyph("logout");
export const AttachIcon = glyph("paperclip");
export const ImageIcon = glyph("image");
export const ClockIcon = glyph("clock");
export const PoundIcon = glyph("currency");
export const PercentIcon = glyph("percent");
export const DocumentIcon = glyph("file");
export const EditIcon = glyph("edit", 1.8);
export const DotIcon = glyph("dot");
export const KeyIcon = glyph("key", 1.8);
export const CopyIcon = glyph("copy", 1.7);

/* --------------------------------------------------------------- travel */

/** The winged jet the design flies across the boarding pass. */
export const PlaneIcon = glyph("plane");
/** The flat "flight" glyph used on form labels and review rows. */
export const FlightIcon = glyph("flight");
export const TripTypeIcon = glyph("triptype");
export const SeatIcon = glyph("seat");
export const CalendarIcon = glyph("calendar");
export const PinIcon = glyph("pin");
export const WalletIcon = glyph("wallet");
export const ChildIcon = glyph("child");
export const WheelchairIcon = glyph("wheelchair");
export const LuggageIcon = glyph("luggage");
export const MealIcon = glyph("meal");
export const HeartIcon = glyph("heart");

/* --------------------------------------------------------------- people */

export const UserIcon = glyph("user");
export const IdCardIcon = glyph("idcard");
export const MailIcon = glyph("mail");
export const PhoneIcon = glyph("phone");
export const WhatsAppIcon = glyph("whatsapp");
export const GlobeIcon = glyph("globe");
export const CarIcon = glyph("car");
export const BriefcaseIcon = glyph("briefcase");
export const ShieldIcon = glyph("shield");
export const HomeIcon = glyph("home");
export const BuildingIcon = glyph("building");
export const LockIcon = glyph("lock");
export const UnlockIcon = glyph("unlock");

/* ------------------------------------------------------------------- nav */

export const DashboardIcon = glyph("dashboard");
export const OrdersIcon = glyph("orders");
export const LedgerIcon = glyph("transactions");
export const VisaIcon = glyph("visa");
export const FamilyIcon = glyph("parents");
export const StaffIcon = glyph("staff");
export const CustomersIcon = glyph("customers");
export const AnalyticsIcon = glyph("performance");
export const SettingsIcon = glyph("settings");
export const NotificationsIcon = glyph("notifications");

export const NAV_ICONS = {
  dashboard: DashboardIcon,
  orders: OrdersIcon,
  transactions: LedgerIcon,
  messages: ChatIcon,
  visa: VisaIcon,
  parents: FamilyIcon,
  /** Parents Tickets identity verification — the marketplace's trust gate. */
  shield: ShieldIcon,
  /** Parents Tickets listings — a route glyph, since a listing IS a journey. */
  board: RouteIcon,
  /** Parents Tickets matches — two people paired. */
  match: FamilyIcon,
  employees: StaffIcon,
  customers: CustomersIcon,
  analytics: AnalyticsIcon,
  support: LifebuoyIcon,
  settings: SettingsIcon,
  notifications: NotificationsIcon,
  /* Customer portal: booking a flight, and the traveller's own record. */
  book: FlightIcon,
  profile: UserIcon,
  /* Driver portal. */
  rides: RouteIcon,
  earnings: WalletIcon,
  car: CarIcon,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

/**
 * The design's `iconForField(label)` — picks a glyph from a field's label so
 * every detail card and form row is annotated the same way across screens.
 */
export function iconForField(label: string): IconName {
  const l = (label || "").toLowerCase();
  if (l.includes("trip type")) return "triptype";
  if (l.includes("cabin")) return "seat";
  if (l === "from" || l.includes("flying from") || l.includes("origin")) return "pin";
  if (l === "to" || l.includes("flying to")) return "pin";
  if (l.includes("depart") || l.includes("return") || l.includes("date")) return "calendar";
  if (l.includes("airline")) return "plane";
  if (l.includes("budget") || l.includes("price") || l.includes("fare")) return "wallet";
  if (l.includes("route")) return "route";
  if (l.includes("passenger") || l.includes("pax")) return "parents";
  if (l.includes("child")) return "child";
  if (l.includes("wheel")) return "wheelchair";
  if (l.includes("luggage") || l.includes("baggage")) return "luggage";
  if (l.includes("phone") || l.includes("contact")) return "phone";
  if (l.includes("email")) return "mail";
  if (l.includes("passport")) return "idcard";
  if (l.includes("nationality") || l.includes("destination") || l.includes("country")) return "globe";
  if (l.includes("currency")) return "currency";
  if (l.includes("requester") || l === "name" || l.includes("lead passenger") || l.includes("customer")) return "user";
  if (l.includes("meal")) return "meal";
  if (l.includes("relationship")) return "heart";
  if (l.includes("role")) return "briefcase";
  if (l.includes("assistance")) return "wheelchair";
  if (l.includes("refusal")) return "check";
  if (l.includes("permission")) return "shield";
  if (l.includes("commission") || l.includes("rate")) return "percent";
  if (l.includes("address")) return "home";
  if (l.includes("trading") || l.includes("company") || l.includes("registered")) return "building";
  if (l.includes("licence") || l.includes("iata") || l.includes("visa type")) return "file";
  if (l.includes("sign-in") || l.includes("processing") || l.includes("intended") || l.includes("travel")) return "clock";
  if (l.includes("message") || l.includes("enquiry") || l.includes("notes") || l.includes("side of request")) return "chat";
  if (l.includes("dob") || l.includes("birth")) return "calendar";
  return "dot";
}
