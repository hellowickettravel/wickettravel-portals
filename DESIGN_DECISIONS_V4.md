# Design system v4 — the decisions

Every choice below was made by the product owner, one question at a time.
This file is the **specification**; `DESIGN_SYSTEM.md` (still v3 at time of
writing) will be rewritten to match it, and `app/globals.css` already
implements the foundations.

Where I overrode a choice, the reason is stated inline and marked **[AA]**.
Those overrides are not preferences — each one is a measured contrast
failure. `scripts/contrast` logic lives in the QA notes at the bottom.

---

## 1. Foundations — DONE

| Decision | Value |
|---|---|
| Density | **Compact.** 14px base · 32/36/42px controls · 40px nav rows · 1440px content |
| Typeface | **Inter** everywhere. **Source Serif 4** on login/signup/reset headlines ONLY. IBM Plex Mono for codes only (order refs, PNRs, airport codes) |
| Radius | **Soft** — 10px controls · 16px cards · 20px panels/modals · 8px chips |
| Brand | **Marine `#12628F`** / deep `#0C4A6E` · **Coral** accent |
| Depth | Border **+ a whisper of shadow** on cards. Real shadow only on things that float |
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

## 2. Auth screens — DONE

- **Split, brand left / form right.** Asymmetric grid `1.05fr / 1fr`.
- **Boarding-pass line-art** behind the marine panel — boarding pass, passport
  stamp, baggage tag, flight arc. Drawn as SVG (`components/auth/boarding-pass-art.tsx`),
  white at 8–11%, pushed to the corners. Nothing runs under type.
- **Footer at the bottom of the FORM column**, sharing the card's 420px measure
  and left edge, behind a hairline. (This was the reported bug: it was centred
  in a column whose card was not.)
- **Source Serif 4** headline at 30px.
- **[scope] Privacy/Terms links omitted** — `/privacy` and `/terms` do not
  exist. The layout leaves room; add the routes, then add the links.

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

- **Contrast**: a script parses `:root` and `.dark` out of `app/globals.css`,
  resolves `var()` chains, and asserts 58 pairs × 2 themes against 4.5:1 (text)
  or 3:1 (non-text). Re-run it after ANY token change.
- **Visual**: Playwright against `next start -p 3100` with a service-role QA
  admin, screenshotting 1440 light, 1440 dark, 1440 collapsed-rail, and 390.
  Asserts `scrollWidth - clientWidth === 0` and captures console errors.
  **Always `next build` before shooting** — `next start` serves the last build,
  and stale artefacts have produced false results twice on this project.
- **Clean up QA rows** (delete the QA auth user) when finished.
