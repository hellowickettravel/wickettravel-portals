# Wicket Travel — Design System

Two design languages live in this codebase, scoped by a root class so neither
leaks into the other:

| Surface                              | Scope class   | Type                        | Palette              |
| ------------------------------------ | ------------- | --------------------------- | -------------------- |
| Employee · Customer · Driver portals | *(default)*   | Plus Jakarta Sans           | **Navy + Orange**    |
| **Admin portal**                     | `.admin-root` | Instrument Sans + Poppins   | **Marine / Ink / Ember** |
| **Auth screens**                     | `.auth-root`  | Instrument Sans + Poppins   | **Marine / Ink / Ember** |

Every token is a CSS variable in `app/globals.css` under `:root`, surfaced to
Tailwind through `@theme inline`. **Consume tokens — never hard-code a hex.**
`bg-marine-500`, `text-ink-700`, `border-line-base`, not `#1E3A5F`.

The admin portal is a pixel-for-pixel port of the Claude Design **"Admin Portal
All Pages"** file. When this document and that file disagree, the file wins —
and the way to settle it is to render the `.dc.html` and diff computed styles,
not to eyeball a screenshot.

---

## 1. Colour

### 1.1 Marine — links, focus, the "one next action"

| Token             | Value                      | Used for                        |
| ----------------- | -------------------------- | ------------------------------- |
| `marine-200`      | `oklch(0.878 0.056 252)`   | focus ring                      |
| `marine-500`      | `oklch(0.505 0.170 257)`   | links, focus border, own chat bubble, marine buttons |
| `marine-600`      | `oklch(0.435 0.148 257)`   | link hover, marine text          |
| `marine-tint`     | `oklch(0.945 0.030 252)`   | ghost hover, tinted chips        |
| `marine-wash`     | `oklch(0.972 0.014 252)`   | KPI icon chips (the paler ramp)  |
| `marine-soft` / `marine-edge` | `oklch(0.968 0.020 252)` / `oklch(0.800 0.070 252)` | selected card fill / border |
| `marine-row`      | `oklch(0.975 0.013 252)`   | table row hover                  |

### 1.2 Ink — the neutral ramp doing most of the work

`ink-50 → ink-950`, a navy-black. The ones that matter:

| Token       | Role                                             |
| ----------- | ------------------------------------------------ |
| `ink-200`   | divider rules                                    |
| `ink-300`   | field and button borders                         |
| `ink-450`   | placeholder, and an em dash standing in for empty |
| `ink-500`   | captions, fine print, table meta                 |
| `ink-600`   | support copy, KPI labels, secondary cells        |
| `ink-700`   | body text, field labels, **page titles**         |
| `ink-800`   | card titles, the primary cell in a row           |
| `ink-880`   | display figures, modal titles                    |
| `ink-950`   | sidebar ink, scrim, shadow colour                |

### 1.3 Ember — the single spark

`ember-600` (`oklch(0.565 0.172 47)`) is the primary CTA; `ember-700` its
hover. `ember-500` is the logo dot and the sidebar's active bar. Ember is for
**filled surfaces** — white text on ember — never small text on a light
background.

### 1.4 Status hues

Each status is a **tint fill + dark ink** pair, no dot:

| Status        | Kind      | Fill              | Ink               |
| ------------- | --------- | ----------------- | ----------------- |
| New           | marine    | `marine-tint`     | `marine-600`      |
| In progress   | **warn**  | `warn-bg`         | `warn-ink`        |
| Completed     | ok        | `ok-bg`           | `ok-ink`          |
| Cancelled     | ink       | `neutral-bg`      | `ink-700`         |
| Danger        | danger    | `danger-bg`       | `danger-ink`      |

> **"In progress" is warn (hue ~82, an amber), not Ember.** The design calls
> that kind `"ember"` internally, but its value is its own amber hue. Reaching
> for the real Ember token here is the easiest mistake to make.

Two tint ramps exist and are not interchangeable:

- **`softTint()` → `*-wash`** — paler. KPI icon chips, wash panels.
- **`tint()` → `*-bg` / `*-tint`** — stronger. Trend pills, status chips.

### 1.5 Danger

A full sub-ramp for destructive surfaces: `danger-mist` (card fill),
`danger-wash` (header fill), `danger-chip` (glyph tile), `danger-edge` /
`danger-rim` (borders), `danger-ink` (text), `danger-title` (heading),
`danger-strong` (the filled confirm button).

### 1.6 Money

Money is **`ink-500`/`ink-600` tabular and never coloured**. Commission is the
only figure allowed a success tint — and only in a KPI, never inside the
Pricing card, where the design leaves every value plain ink.

---

## 2. Typography

- **Instrument Sans** — body, labels, inputs, table cells, card titles.
- **Poppins 500** — page titles, the brand wordmark, display figures, modal
  titles. Nothing else.
- Weights are **400 / 500 / 600 only**.

Loaded in `app/layout.tsx` as `--font-instrument-sans` / `--font-poppins-sans`.

The project-wide `h1..h4 { font-family: Jakarta }` base rule is **cancelled
inside `.admin-root`** (`:is(h1,…,h6)` → Instrument Sans, tracking cleared), so
a bare `<h2>` in an admin component gets the right face without a utility.

### The scale

| Element              | Size            | Weight | Tracking   | Line height |
| -------------------- | --------------- | ------ | ---------- | ----------- |
| Page title (h1)      | `clamp(20px,1.5vw,24px)` Poppins | 500 | `-0.02em` | **1.5**, colour **ink-700** |
| Page subcopy         | 13.5px          | 400    | —          | 1.5         |
| Card title (h2)      | 13.5px          | 600    | `-0.008em` | 1.5         |
| Section eyebrow      | 11px uppercase  | 500/600| `0.11em`   | —           |
| Table head           | 11px uppercase  | 500    | `0.09em`   | —           |
| Table cell           | 12.5–13px       | 400/500| —          | —           |
| KPI label            | 11px uppercase  | 500    | `0.11em`   | —           |
| KPI value            | 24px Poppins    | 500    | `-0.022em` | 1           |
| Status pill          | 11px            | 500    | —          | `normal`    |
| Chat role caption    | 9.5px uppercase | 600    | `0.06em`   | —           |

> **The line-height trap.** Several rows in the design are `<button>`s, so
> their contents sit on the UA's `line-height: normal`, not the shell's 1.5.
> Where a row's height has to match — dashboard order rows, sidebar nav items,
> status pills — put `leading-[normal]` on the row so its children inherit it.
> Missing this makes rows 7–10px too tall.

---

## 3. Shape, spacing, elevation

**Buttons are pills (999px); containers are rectangles.**

| Thing        | Radius        |
| ------------ | ------------- |
| Buttons, pills, avatars | `999px` / `50%` |
| Controls (inputs, selects, icon buttons) | `10px` |
| Cards        | `12px`        |
| Modal sheets | `16px`        |
| Glyph tiles  | `9px`–`11px`  |

`--radius` is `0.75rem` inside admin, so Tailwind's `rounded-lg`/`rounded-xl`
resolve to 12px/16.8px — **write `rounded-[10px]` / `rounded-[12px]`
explicitly** rather than relying on the scale.

**Elevation** — one shadow does almost all the work:

```
E1  0 1px 2px  oklch(0.205 0.038 258 / 0.04)   cards, KPI tiles
E2  0 4px 12px oklch(0.205 0.038 258 / 0.07)   toggles, floating chips
E3  0 20px 48px oklch(0.205 0.038 258 / 0.16)  popovers
    0 24px 70px oklch(0.205 0.038 258 / 0.28)  modal sheets
```

**Rhythm** — screens stack at `gap: 24px` inside a `max-width` of 1400px
(1080px on Settings, 1240px on order detail). Cards use `16px 20px` heads and
`20px` bodies. Grids are `repeat(auto-fit, minmax(Npx, 1fr))` with a 16px gap.

---

## 4. Controls

| Size | Height | Padding  | Label   | Used for                          |
| ---- | ------ | -------- | ------- | --------------------------------- |
| xs   | 30px   | `0 14px` | 12px    | in-table View, icon pills         |
| sm   | 34px   | `0 16px` | 12px    | Load more, in-card actions        |
| md   | 40px   | `0 20px` | 13px    | the default                       |
| md+  | 40px   | `0 24px` | 13px    | filled CTAs (ember / marine)      |
| lg   | 48px   | —        | —       | auth screens only                 |

Filter chips are their own thing: 34px, `0 16px`, **13px**, and the selected
chip is a solid `ink-800` fill with white type — deliberately not marine, so
the filter row never competes with the primary action.

**One focus ring everywhere:** `box-shadow: 0 0 0 3px var(--color-marine-200)`
(`focusRing` in `components/admin/ui.tsx`).

Table footers run their 40px button at **12.5px**, a half-step below the
standard label.

---

## 5. Tables

- Rows **54px**, cells `0 20px`.
- Head 40px, 11px uppercase `0.09em`, on `--color-surface-2`, with a
  `line-strong` bottom rule.
- Row hover `marine-row`; every row has a `line-soft` top border.
- Horizontal scroll is opt-in, inside `.om-scroll`.
- **Every list has an explanatory empty state** (`EmptyState`) — a filtered
  table never renders as a blank box.
- Routes render as IATA codes (`routeLabel()` → `LHR → DXB`), never full place
  names.
- An unset assignee is an **em dash in `ink-450`**, not the word "Unassigned".

---

## 6. Icons

The icon set is the design's own `ico()` table, copied **path-for-path** into
the `GLYPHS` map in `components/admin/icons.tsx`. 24-unit box, 1.7px stroke,
`currentColor`, round caps, no icon library.

**Do not redraw or "tidy" a glyph — the numbers *are* the drawing.**

- `<Ico name="orders" size={18} width={1.7} />` renders any of them.
- `iconForField(label)` is the design's own label→glyph mapping, used by every
  detail card and form row.
- Two glyphs (`key`, `copy`) are ours, drawn in the same idiom for controls the
  design never had to show.

`/admin` uses **no `lucide-react`** and none of the shadcn primitives in
`components/ui/`. Those belong to the navy/orange portals.

---

## 7. Components

All in `components/admin/`:

| File                | What it holds                                              |
| ------------------- | ---------------------------------------------------------- |
| `ui.tsx`            | `Screen`, `PageHead`, `Card`, `CardHead`, `Kpi`, `Btn`, `Pill`, `FilterChip`, `Table`/`Th`/`Td`/`Tr`, `TableFoot`, `EmptyState`, `TableSkeleton`, `Avatar`, `DataRow`, `FieldTile`, `Money`, `Spinner`, `focusRing` |
| `icons.tsx`         | the glyph table + `iconForField()`                          |
| `admin-shell.tsx`   | 256px sidebar + 64px top bar                                |
| `sheet.tsx`         | `Sheet`, `SheetHead`, `SheetFoot`, `ConfirmSheet`           |
| `person-dialog.tsx` | the Add/Edit person sheet + `AccessCard`                    |
| `admin-inbox.tsx`   | the two-pane conversation inbox                             |
| `order-detail.tsx`  | the order screen                                            |
| `order-thread.tsx`  | the per-order Messages card                                 |
| `admin-order-form.tsx` | the three-step Create-an-order wizard                    |
| `boarding-pass.tsx` | the order header pass                                       |
| `message-bits.tsx`  | admin-skinned message text + attachment                     |

### One component, three portals

There is no longer a second skin. `PageHeader`, `SectionCard`, `StatCard`,
`StatusBadge` and `UserCell` — and the paired `.wt-*` rules that gave them a
navy/orange look outside `.admin-root` — were deleted once the customer portal
moved onto this system. Everything in `components/admin/` is now simply *the*
component.

Where a portal genuinely needs different behaviour, the rule is: **generalise
the component with a prop that defaults to the admin's behaviour**, never fork
it or restyle it in place.

| Component              | Props that carry a portal          |
| ---------------------- | ---------------------------------- |
| `admin-shell.tsx`      | `sections`, `roleLabel`, `homeHref`, `settingsHref`, `settingsLabel`, `supportHref`, `searchScreens`, `mobileTabs` |
| `order-detail.tsx`     | `basePath`, `canEdit`, `canAssign`, `canViewCustomer` |
| `order-thread.tsx`     | `viewerRole`, `canSend`, `lockedNotice` |
| `admin-order-form.tsx` | `audience`, `basePath`, `onCreate`, `prefill`, `contactEmail`, `contactPhone`, `isGuest` |
| `admin-notifications.tsx` | `basePath`, `settingsHref`            |
| `boarding-pass.tsx`    | `priceLabel`                       |

Only two screens are built fresh rather than shared, and both for a structural
reason rather than a visual one: `components/employee/employee-inbox.tsx` (the
admin inbox's reads all `requireAdmin()`, and its row shape differs) and
`components/customer/messages-view.tsx` (a customer has exactly one
conversation, so there is no list pane to render).

### The shell

- Sidebar **256px** on a vertical ink ramp (`sidebar-top` → `sidebar-bottom`),
  grouping the eleven areas into **Dashboard / Work / Enquiries / Peoples /
  Admin**.
- Active item: 10%-white fill plus a 3px **ember** inset bar — never a marine
  fill.
- Queue counts are small warm figures (`nav-count`), capped at **9+**.
- Off-canvas below 1024px behind a hamburger and a scrim — **unless**
  `mobileTabs` is supplied, which swaps the rail for a bottom tab bar below
  1024px. Only the customer portal does this: staff sit at desks, travellers
  arrive on a phone. Anything the tabs omit must stay reachable from the bell
  or the account menu.
- Top bar 64px, `white/0.88` with a 10px blur. Its search is **per-screen** —
  it renders only for screens listed in `SEARCH`, each with its own
  placeholder, and hands the term over as `?q=`, which the screen reads with
  `useSearchParams`.

---

## 8. Modals

`/admin` has one modal language, in `sheet.tsx`:

- Scrim `oklch(0.205 0.038 258 / 0.42)` with a 3px blur.
- Sheet: 16px radius, `max-height: 90vh`, `0 24px 70px` shadow. 780px for a
  form, 460px for a confirm, 620px for the order edit.
- Header: 40px tinted glyph tile (marine, or danger when destructive), Poppins
  17px title, 12.5px subcopy, a 34px round close.
- Body scrolls; sections carry an uppercase 11px heading over a
  `minmax(240px,1fr)` grid of **42px** controls.
- Footer on `surface-1`: a note on the left, Cancel + the filled CTA on the
  right.

Escape closes, the body behind is locked, focus moves to the first field.

---

## 9. Copy rules

- Status labels are **sentence case** — `statusLabel()` gives "In progress",
  never "In Progress". `titleCase()` is for other enums.
- Dates have one form per context, all in `lib/format.ts`:

| Helper          | Output                    | Where                              |
| --------------- | ------------------------- | ---------------------------------- |
| `fmtDate`       | `5 May 2026`              | tables (no leading zero, "Sep")    |
| `fmtFullDate`   | `12 August 2026`          | flight tiles, thread day dividers  |
| `fmtLongDate`   | `Tuesday 4 August 2026`   | the dashboard standfirst only      |
| `fmtStamp`      | `Today, 09:04` → `Yesterday, 16:20` → a date | queue lists |
| `fmtInboxTime`  | clock → Yesterday → weekday → date | the Messages list         |
| `fmtRelative`   | `2h ago`                  | **the activity feed and nothing else** |

  The design never writes "5d ago" in a list.
- `routeLabel()` for routes, `gbp()` for money, `placeCode()` for one airport.

---

## 10. Known, deliberate divergences

These differ from the design file on purpose:

1. **Account button typeface.** The design's markup omits `font-family:
   inherit` on that button, so its label renders in **Arial**. That is a slip
   in the file, not intent — we keep Instrument Sans.
2. **Access level.** The design ticks seven independent areas. RLS enforces a
   single `access_level` tier, so the same cards are a radiogroup — a per-area
   matrix would look right and enforce nothing.
3. **Security toggles.** The design's Security tab shows four switches (2FA,
   session timeout, export restriction, employee password resets). Nothing
   enforces them yet, so they are not shipped: a switch that claims to require
   2FA and does not is worse than an absent one.
4. **Thread role captions.** The admin threads use the design's
   *User / Support / Admin*; the shared `ROLE_LABEL` the other portals use says
   *Customer / Support Team / Admin*. Two maps, on purpose.
5. **Row actions.** The design's people table ends on a single View pill. Edit,
   deactivate and delete have to live somewhere, so they sit inline as 30px
   icon pills in the design's own control language.
6. **Customer status vocabulary.** A customer sees `new` as **"Received"**,
   not "New" — `customerStatusLabel()` in `lib/format.ts` is the only place
   that translation lives. Every other status word is shared.
7. **Reply-to-quote.** The old navy/orange chat let either side quote a
   message. The design's thread has no quoting affordance, so it is gone from
   every portal rather than working on one side only.

---

## 11. Working on `/admin`

1. Render the design: recover `Admin Portal All Pages.dc.html`, inject React 18
   UMD before `support.js`, serve it over http (the runtime fetches its own
   document, which `file://` blocks).
2. Probe both sides with `getComputedStyle` and compare. Normalise colours by
   painting them on a 1×1 canvas — the design reports `oklch(…)` and the app
   reports `lab(…)` for the same colour.
3. Ignore three classes of false positive: `<a>` vs `<button>`,
   `rounded-full` vs `50%`, and `display:flex` vs `block` on a single-line box.
4. Any new screen in **any** of the three portals must render inside
   `AdminShell` to inherit `.admin-root`.

### What a customer must never see

The customer portal renders the same order screens as staff, so the boundary is
worth stating plainly. Cost price, commission, internal staff notes, the
assignment card and every edit/status control are **absent from the markup**,
not merely hidden — and RLS is the actual gate in each case. When adding a
field to a shared order component, decide which side of that line it sits on
before you decide where it goes on the page.
