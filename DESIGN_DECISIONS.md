# Design system — the decisions

Every choice below was made by the product owner, one question at a time.
This file is the **specification**; `DESIGN_SYSTEM.md` (still v3 at time of
writing) will be rewritten to match it, and `app/globals.css` already
implements the foundations.

Where I overrode a choice, the reason is stated inline and marked **[AA]**.
Those overrides are not preferences — each one is a measured contrast
failure. Run `node scripts/contrast-audit.mjs` after ANY token change.

---

## 0. v5 — the reference pass

v4 was answered question-by-question and got the *structure* right, but the
result still read as a cold admin tool. The owner then supplied two
screenshots of a login screen they had shipped elsewhere and asked for that
feel: `assets/focus-the-vibe-…png` and `assets/refrence-for-fonts.png`, plus
`assets/login-page-feedback.png` — their own red/yellow markup on the v4
login, which is the clearest statement of what was wrong.

The reference was measured rather than eyeballed (PIL sampling + a Playwright
render-and-diff for the face). What it actually does:

| Measured | Value |
|---|---|
| Split | **42 / 58** — the brand panel is the NARROWER half |
| Brand panel | **flat** `#B00D33`. No art, no gradient, no feature list |
| Paper | `#FFF6F8` — **brand-tinted, never white** |
| Field fill | `#FBEFF4` — one step deeper than the paper, **16px radius**, 56px tall |
| Action | `#E30D3B` — a *second, more saturated* brand value. **Full pill**, 56px |
| Glow | a real brand-tinted bloom under the button, ~25px falloff |
| Neutrals | `#33292E` / `#5C4D54` / `#9C8B93` — **every one hue-shifted to the brand.** No cold grey anywhere |
| Face | **Figtree** — identified by pixel IoU against 20 candidates: Figtree 800 scored 0.857, next best 0.771 |

The transferable idea is the last row. The reference feels like a brand and
doesn't tire the eye because *the paper and the whole neutral ramp carry the
brand hue*, so nothing on screen is a cold white or a neutral black fighting
a saturated colour.

**Applied to Wicket** — same structure, Wicket's own palette:

- **Marine stays the panel**, coral becomes the vivid action. Two brand
  values with the reference's two jobs.
- **The paper warms toward the coral**, not the marine: a blue-tinted page
  reads clinical, and warmth was the whole point. Canvas `#FBF6F1`.
- **The neutral ramp is warm**: `#231D18` / `#4C433B` / `#6F6459` / `#9C9086`.
- **Figtree replaces Inter**, and the display serif is deleted outright —
  the owner red-boxed it. One face for the entire product.
- Radius: controls 10 → **12**; the tall auth field gets **16**.
- **`--elev-action`**, a coral-tinted bloom, is the only glow in the system.

**[AA] The field keeps a border.** The reference has none — its field is
1.03:1 against its page, which cannot identify a control under WCAG 1.4.11.
`--field-border` is pinned at `#94897E`, the *lightest* value that still
clears 3:1 on white, on the canvas and on its own fill. This is the one place
the screen deliberately departs from the reference. Focus earns it back: the
border goes marine behind a 3px ring, far louder than the reference's.

---

## 1. Foundations — DONE

| Decision | Value |
|---|---|
| Density | **Compact.** 14px base · 32/36/42px controls · 40px nav rows · 1440px content |
| Typeface | **Figtree** everywhere — 800 for the auth headline. IBM Plex Mono for codes only (order refs, PNRs, airport codes). **No serif in the product.** |
| Radius | **Soft** — 12px controls · 16px cards and tall fields · 20px panels/modals · 8px chips · full pill for the auth submit only |
| Brand | **Marine `#12628F`** / deep `#0C4A6E` · **Coral** accent |
| Paper | **Warm.** Canvas `#FBF6F1`, and the whole neutral ramp is hue-shifted to match |
| Depth | Border **+ a whisper of shadow** on cards. Real shadow only on things that float. One coral bloom, under the primary action |
| Motion | **Moderate** — rise-and-fade on load, staggered cards, colour-only hover |
| Themes | **Light AND dark**, both shipped |
| Responsive | **Full, down to 390px** |

**[AA] Coral was darkened.** The chosen `#E2542C` gives white text 3.79:1 and
fails AA on every button. So:

- `--coral: #C4401C` — the accessible FILL (5.13:1). Buttons, monogram.
- `--coral-vivid: #E2542C` — graphics ONLY (3:1): dots, edge bars, chart marks.
- `--coral-on-rail: #FFB499` — coral as TYPE on the marine rail. Nothing
  darker clears 4.5:1 on `#0C4A6E`.
- Coral and ruby fills **do not lighten in dark mode** — every "dark-mode
  correct" value drops white below AA.

Touch targets: the compact scale is a **desktop** affordance. Every control
grows to ≥44px below 640px.

---

## 2. Auth screens — DONE (rebuilt to the reference in v5)

- **Split, brand left / form right, `42fr / 58fr`.** The panel is the
  narrower half: it holds four short things, while the form carries the
  whole interaction and benefits from the air.
- **Flat marine panel.** No artwork — the boarding-pass SVG is deleted, and
  so is the three-item proof list (the owner red-boxed it). Four things
  only, on the panel's three anchors: micro-label top-left, lockup +
  statement centred, domain bottom-left. The restraint is the design.
- **No card around the form.** Fields are filled and the paper is warm, so
  the column already reads as one object; boxing it drew a second frame
  inside a screen already split down the middle.
- **Figtree 800 headline at 40px** (36 below `sm`).
- **Uppercase micro labels above 56px filled fields** — `components/auth/auth-field.tsx`.
- **Full-pill coral submit with the coral bloom** — `components/auth/auth-submit.tsx`.
  The only pill and the only glow in the product; both are load-bearing
  because this page has no card, no shadow and no other saturated colour.
- **Footer travels WITH the form**, inside the centred 440px column behind a
  hairline, sharing its left edge. Pinned to the bottom of the viewport (v4)
  it drifted from what it belongs to and read as debris — that was the
  original reported bug and this is the second, better fix.
- **[scope] Privacy/Terms links omitted** — `/privacy` and `/terms` do not
  exist. The measure leaves room; add the routes, then add the links.

---

## 3. Portal shell — DONE

- **240px solid marine rail** (`--rail: #0C4A6E`), collapsing to a **56px icon
  rail**; the choice is remembered per device via `useSyncExternalStore` so it
  never flashes open on navigation.
- Nav **grouped** with uppercase micro-labels (WORK / ENQUIRIES / PEOPLE /
  ACCOUNT). Collapsed, group labels become hairlines and count badges become dots.
- **Active row = 3px coral edge bar + soft white wash.** Deliberately NOT a
  filled pill: the one solid coral on screen is reserved for the primary action,
  so navigation never competes with it.
- **56px topbar**: global search (left) → theme toggle, bell, help, avatar.
  The page name is NOT repeated here — `<PageHeader>` owns the only `<h1>`.
- Search is **real**: submits to `/{portal}/orders?q=`, which that screen reads.

---

## 4. Dashboard — TODO

Layout: **stat cards → wide chart + narrow live feed → recent orders table.**

- **4 stat cards**: Total orders · Revenue · In progress · Unread messages.
- Card style: **white surface, tinted icon chip**, hairline border, soft shadow.
  Colour appears only in the chip and the trend arrow. `<StatCard>` is DONE.
- Chart: **soft area chart, single marine fill**, faint horizontal gridlines
  only, tooltip on hover. **Not yet built.**
- **Live activity feed** beside it. **Not yet built.**

---

## 5. Orders list — TODO

- Table: **hairline rows in a bordered card**, no zebra. DONE via `<Table>`.
- Status: **dot + plain text**, no badge. DONE via `<StatusBadge>`.
  Hues: violet New · marine In progress · jade Completed · ruby Cancelled.
- Toolbar: **status tabs with live counts + search + a Filters menu.**
  Tabs and search exist; the Filters menu is **not yet built**.
- Row interaction: **clicking a row opens a side drawer**, so you never lose
  your place in the queue. Full page stays available behind a button.
  **Not yet built.**
- **New order uses that same drawer** — one surface for reading and creating.
  **Not yet built.**

---

## 6. Order detail — TODO

- **Split: details left, live chat permanently right.** Not tabs, not a
  scrolled-to section — the conversation is always on screen.
- **Route diagram** for the flight: big airport codes, times underneath, a
  thin line with a plane glyph showing duration and stops.
- **History collapsed behind a "View full history" toggle**, one-line summary
  visible.
- **One primary button naming the next step** — "Start work", then "Mark
  completed". Everything else quiet. Never a free-form status dropdown.

---

## 7. Inbox — TODO

- **Three panes**: conversation list · thread · context rail showing the linked
  order, customer and quick actions.
- **Sided bubbles** — customer left on white with a border, your side right on
  soft marine. Role name and time above each group.
- Conversation rows: **avatar, name, order ref, preview, time** (3 lines),
  unread gets a coral dot and bolder text.
- Composer: text + attach + saved replies + send, **plus an internal-note
  toggle** that turns the field amber and posts staff-only.
- Realtime: **typing indicator and unread counts only.** No presence dots, no
  toasts — deliberately quieter than the full option.

---

## 8. Components — DONE unless noted

- **Buttons**: solid coral primary (one per screen) · **soft marine-tint**
  secondary, no border · ghost tertiary · ruby-wash destructive that commits
  to a solid fill on hover. Nothing moves on hover — colour only.
- **Fields**: **filled** (`--field`) with the label above. A filled field also
  carries a `--field-border` because a fill alone is 1.05:1 and cannot identify
  a control (WCAG 1.4.11). **Therefore every form needs a white card behind it**
  — structural, not decorative.
- **Empty states**: line illustration + heading + one action. **Not yet built.**
- **Imagery**: **no stock photography anywhere.** Line-art and Lucide icons
  only. People are coloured initials avatars; an uploaded photo replaces them.
- **Feedback**: toast bottom-right (auto-dismiss for success, persistent for
  error) + inline errors under the offending field.
- **Loading**: skeletons matching the real shape exactly + a thin coral top
  progress bar. **No shimmer** — a screen full of moving gradients is noisier
  than one that is simply waiting. Progress bar **not yet built.**

---

## 9. Known defects to fix

- **[AA] Driver portal + style guide use `coral-vivid` as small text** on dark
  grounds (`app/(driver)/driver/page.tsx`, `profile/page.tsx`,
  `app/style-guide/style-guide.tsx`). Fails 4.5:1. Use `--coral-on-rail`.
- `DESIGN_SYSTEM.md` and `CLAUDE.md` still describe v3.
- `/style-guide` still specimens v3 vocabulary.

---

## QA method

- **Contrast**: `node scripts/contrast-audit.mjs` parses `:root` and `.dark`
  out of `app/globals.css`, resolves `var()` chains, and asserts 90 pairs ×
  2 themes against 4.5:1 (text) or 3:1 (non-text). Re-run it after ANY token
  change. It exists because eyeballing does not work — the first run of the
  v4 palette had ten failures in it, every one of which looked fine.
- **Visual**: Playwright against `next start -p 3100` with a service-role QA
  admin, screenshotting 1440 light, 1440 dark, 1440 collapsed-rail, and 390.
  Asserts `scrollWidth - clientWidth === 0` and captures console errors.
  **Always `next build` before shooting** — `next start` serves the last build,
  and stale artefacts have produced false results twice on this project.
  **And check the port is actually free first** (`ss -ltnp | grep 3100`): a
  server left running from before a rebuild keeps answering with chunk names
  the rebuild invalidated, which shows up as a wall of MIME-type console
  errors and Times New Roman in the screenshots. Note that `pkill -f "next
  start"` matches its own command line and kills the shell — kill the PID.
- **Clean up QA rows** (delete the QA auth user) when finished.
