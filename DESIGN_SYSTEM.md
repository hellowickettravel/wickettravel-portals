# Wicket Travel — Design System (Locked)

Complete reference extracted from `design-system.html`, which stays in place as the
visual specimen. **This file is the working source of truth for code.** Live at
`/style-guide` (dev-open, admin-only in production).

> No component file should ever contain a raw hex or a one-off pixel value.
> Consume the tokens. Light mode only — there is no dark theme.

Implementation lives in:

- `app/globals.css` — CSS variables in `:root`, surfaced as Tailwind utilities via `@theme inline`
- `app/layout.tsx` — the three typefaces via `next/font/google`
- `components/ui/*` — the primitives

---

## 1. Typefaces

| Face | Role | Weights | Token |
|---|---|---|---|
| **Hanken Grotesk** | Everything — headings, body, UI | 400 · 500 · 600 · 700 (never heavier) | `font-sans`, `--font-hanken` |
| **Newsreader** *italic* | One editorial moment per page. Never headings, labels or UI. | italic 400 | `font-serif` / `font-editorial`, `--font-newsreader` |
| **IBM Plex Mono** | Airport codes, booking refs, timestamps, uppercase micro-labels | 500 only | `font-mono`, `--font-plex-mono` |

Retired for good: Plus Jakarta Sans, Inter, Poppins, Archivo.

---

## 2. Type scale

Locked values. If a size isn't on this list, it doesn't go on a screen.

| Name | Weight | Size / line-height | Tracking | Colour |
|---|---|---|---|---|
| Display (hero only) | 700 | 44 / 48 (1.08) | −0.02em | `#0A3A66` |
| H1 · page title | 700 | 32 / 37 (1.16) | −0.015em | `#0A3A66` |
| H2 · section | 700 | 25 / 31 (1.26) | −0.01em | `#0A3A66` |
| H3 · block | 600 | 19 / 26 (1.36) | −0.005em | `#0A3A66` |
| H4 · card title | 600 | 16.5 / 23 (1.42) | — | `#0A3A66` |
| Lead | 400 | 18 / 30 (1.65) | — | `#37485C` |
| Body | 400 | 16 / 27 (1.7) | — | `#37485C` |
| Small | 400 | 14.5 / 23 (1.6) | — | `#6B7C8E` |
| Caption | 400 | 13 / 20 (1.5) | — | `#98A6B5` |
| Metric | 700 | 30 / 34 (1.15) | −0.022em | `#0A3A66`, tabular |
| Micro-label | Plex Mono 500 | 11 | 0.1em, uppercase | context |
| Editorial | Newsreader italic 400 | 22 / 32 (1.45) | — | `#37485C` |
| Button | 600 | 15 | −0.002em | per variant |
| Form label | 600 | 13.5 | −0.002em | `#0A3A66` |

**Tracking tokens** — `tracking-display` (−0.02em) · `tracking-heading` (−0.015em) ·
`tracking-ui` (−0.002em, buttons/labels/field text) · `tracking-micro` (0.1em, Plex uppercase).
Tailwind's own `tracking-tight`/`wide`/`wider` still exist; prefer these when you mean the system.

**Text colours — five, never pure black**

| Role | Hex | Token | Notes |
|---|---|---|---|
| Heading | `#0A3A66` | `text-tx-head` | ocean deep |
| Body | `#37485C` | `text-tx-body` | 9.4:1, still AAA |
| Muted | `#6B7C8E` | `text-tx-muted` | captions, secondary lines, 4.9:1 |
| Faint | `#98A6B5` | `text-tx-faint` | placeholders, micro-labels, disabled |
| Invert | `#FFFFFF` | `text-tx-invert` | on ocean; body `#C6DCEF` (`tx-invert-2`), muted `#A6C6E2` (`tx-invert-3`) |

- **Link** `#0F4C81`, underline at 3px offset, 1px thickness.
- **Accent text** `#C0451F` — eyebrows, fares, one link per view.
- **Measure** body capped at 68 characters, lead at 58.
- **Numerals** `tabular` utility (`font-variant-numeric: tabular-nums`) on every fare, metric and table column.

Utilities: `font-micro`, `font-editorial`, `tabular`.

---

## 3. Colour tokens

Every token exists both as a CSS variable (`var(--ocean)`) and a Tailwind utility (`bg-ocean`, `text-ocean`, `border-ocean`).

### Brand

| Token | Hex | Use |
|---|---|---|
| `ocean` | `#0F4C81` | primary action, links, brand surface |
| `ocean-deep` | `#0A3A66` | headings, sidebar, primary hover |
| `ocean-night` | `#082F55` | bottom of every ocean gradient |
| `sky` | `#7EC3F0` | graphical accents on ocean |
| `sky-tint` | `#EDF4FB` | grouping sections, secondary buttons, selected states |
| `sky-line` | `#D5E6F5` | border on sky-tinted surfaces |
| `coral` | `#FF6F4D` | graphical accents only — too light for text |
| `coral-deep` | `#C0451F` | accent button, eyebrows, fares, focus ring |
| `coral-press` | `#A63A18` | accent button hover |
| `coral-tint` | `#FFF1EC` | notes, featured chips |
| `coral-line` | `#FBDACE` | border on coral tint |

### Data hues — the hue is fixed by meaning

| Token | Hex | Tint | Border | Meaning |
|---|---|---|---|---|
| `amber` | `#E9A233` (text: `amber-deep` `#8F5B08`) | `#FEF5E6` | `#F5DFB8` | money |
| `mint` | `#0E7F72` | `#E4F3F0` | `#C4E5DE` | confirmed |
| `indigo` | `#4552C0` | `#EFF1FD` | `#DADFFA` | waiting |
| `rose` | `#BB3348` | `#FDEEF0` | `#F8D3D9` | attention, destructive, errors |
| `ocean` | `#0F4C81` | `#EDF4FB` | `#D5E6F5` | volume |
| `coral-deep` | `#C0451F` | `#FFF1EC` | `#FBDACE` | featured |

### Surfaces & lines

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F6F9FC` | page background |
| `surface` | `#FFFFFF` | cards, panels, inputs, alternating sections |
| `sunk` | `#F1F5FA` | disabled fields, empty states, table header rows |
| `line-faint` | `#F0F4F9` | internal dividers |
| `line` | `#E7EDF5` | card & section borders |
| `line-strong` | `#D7E1EC` | inputs and anything interactive |
| `line-hover` | `#C3D2E1` | input border on hover |

**Section rule** — alternate canvas → white → sky tint; never three of the same in a row.
Ocean statement band once or twice per page. 1px `line` rule top and bottom whenever the background changes.

### Retired names

The pre-2026 aliases are gone — there is one vocabulary now. If you meet any of these in
an old branch or a snippet, translate it: `brand`→`ocean`, `brand-dark`→`ocean-deep`,
`navy`→`ocean-deep` (as text, `tx-head`), `navy-dark`→`ocean-night`, `navy-light`→`ocean`,
`orange`→`coral-deep`, `orange-dark`→`coral-press`, `orange-light`→`coral`,
`chip`→`sky-tint`, `neutral-soft`→`sunk`, `outline`→`line-strong`, `shadow-card`→`shadow-lift`,
`font-display`→`tracking-heading`, `font-label`/`font-heading`→ nothing (the body face is
already the only face). None of them resolve any more, so a stale one renders as no style
at all rather than as the wrong colour.

---

## 4. Radius — the clipped corner

Every surface carries one small corner, top-left, as though the document had been clipped
and filed. Controls stay symmetrical so they read as controls.

| Token | Value | Applies to |
|---|---|---|
| `rounded-surface` | `5px 18px 18px 18px` | cards, panels, images, popups |
| `rounded-surface-lg` | `6px 24px 24px 24px` | feature blocks, modals, dark bands |
| `rounded-control` | `8px` | buttons, inputs, selects, choice cards |
| `rounded-chip` | `6px` | badges, tags, labels — **never a pill** |
| `rounded-icon` | `12px` | icon chips |
| `rounded-full` | circle | avatars and status dots only (plus the radio indicator) |

Images take their container's radius — the clip carries through.

**Banned:** 16px-on-everything · `rounded-2xl` · pill buttons · pill eyebrows.

---

## 5. Depth

| Token | Value | Use |
|---|---|---|
| `shadow-lift` | `0 1px 2px rgba(10,58,102,.04), 0 6px 16px rgba(10,58,102,.05)` | resting cards, panels, secondary buttons |
| `shadow-lift-lg` | `0 2px 6px rgba(10,58,102,.05), 0 14px 30px rgba(10,58,102,.09)` | card hover (+2px rise) |
| `shadow-lift-in` | `inset 0 1px 2px rgba(10,58,102,.05)` | inputs |
| `shadow-btn-ocean` | `0 1px 2px rgba(10,58,102,.14), 0 5px 14px rgba(15,76,129,.22)` | primary button |
| `shadow-btn-ocean-hover` | `0 2px 4px rgba(10,58,102,.16), 0 9px 20px rgba(15,76,129,.26)` | primary button hover |
| `shadow-btn-coral` | `0 1px 2px rgba(120,40,18,.16), 0 5px 14px rgba(192,69,31,.24)` | accent button |

**A card sitting on a white section keeps its border and drops its shadow.** Enforced in
`globals.css` via `[data-section-tone="white"] [data-slot="card"]`, which `<Section tone="white">` sets.

**Banned:** black shadows, blur beyond 30px, glow, glass blur, gradient borders.

---

## 6. Spacing

4px grid, applied without exception: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72 · 96 · 128**.

| Relationship | Value |
|---|---|
| Section vertical | 96 desktop · 72 tablet · 56 mobile |
| Container | 1160px max · 40px gutters desktop · 24px mobile |
| Grid gap | 20 cards · 24 wide layouts · 12 inside a card |
| Card padding | 26 / 28 desktop · 20 / 22 mobile |
| Eyebrow → H2 | 12 |
| H2 → lede | 14 |
| Head → content | 32 |
| Heading → body inside a card | 10 |
| Paragraph gap | 16 |
| Label → input | 8 |
| Field → field | 22 |
| Input → error | 8 |
| Button row gap | 12 |
| Icon → label | 9 in buttons · 13 in nav |

**The rhythm rule:** space between groups is always larger than space inside a group.

---

## 7. Icons

- **lucide-react, exclusively.** No emoji, no filled icons, no second set.
- **Stroke 1.75 at every size** — set globally in `globals.css` (`svg.lucide { stroke-width: 1.75 }`), so call sites don't pass `strokeWidth`.
- **Sizes:** 16 inline · 18 buttons · 20 nav & chips · 24 page headers.
- Colour inherits text colour; inside a chip it takes the semantic hue.
- Optically centred, never baseline-aligned with text.
- Icons alone only in icon-buttons, always with an `aria-label`.

**Icon chip** — `<IconChip tone="…">`: 42px, `rounded-icon`, hue at 9–16% background, 20px icon.
Tones: `ocean` · `coral` · `amber` · `mint` · `indigo` · `rose` · `neutral`.

**The only two places a hex may appear outside `globals.css`:**

1. `components/icons/google.tsx` — Google's four brand colours, named in a local
   `GOOGLE_BRAND` const. A third-party mark must be reproduced exactly, so it cannot be
   mapped onto our palette. Nothing else may import it.
2. `lib/design/brand.ts` — `BRAND.ocean` / `BRAND.coral`, for the few places that cannot
   reach a CSS variable: hex shown to a user as literal copy (the admin Branding panel),
   canvas/PDF output, outbound email. Never import it to style a DOM node.

---

## 8. Buttons — `components/ui/button.tsx`

Type: Hanken Grotesk 600 · 15px · −0.002em. Never uppercase, never letterspaced.
Radius `rounded-control` (8px). Icon 18px, 1.75 stroke, 9px gap, leading side.

| Variant | Fill | Text | Hover |
|---|---|---|---|
| `default` (primary) | `ocean` + `shadow-btn-ocean` | white | `ocean-deep` + deeper shadow |
| `accent` | `coral-deep` + `shadow-btn-coral` | white | `coral-press` — **one per view, maximum** |
| `secondary` / `outline` | white, 1px `line-strong`, `shadow-lift` | `ocean-deep` | ocean border + sky-tint fill |
| `ghost` | transparent | `ocean` | sky-tint |
| `destructive` | `rose-tint`, `rose-line` border | `rose` | solid rose, white text |
| `link` | none | `ocean` | underline, 3px offset |

| Size | Height | Padding |
|---|---|---|
| `sm` | 38 | 16 |
| `default` | 46 | 22 |
| `lg` | 54 | 28 |
| `xs` | 32 | 12 |
| `icon` / `icon-sm` / `icon-xs` / `icon-lg` | 46 / 38 / 32 / 54 square | — |

**States** — hover deepens the fill and shadow; **buttons do not rise, only cards do**.
Active `translate-y-px`. Focus `outline 2px coral-deep at 3px offset`. Disabled `opacity .42`,
no pointer events, no shadow.

---

## 9. Form fields

`components/ui/input.tsx` exports `fieldClassName`, shared by `<Input>`, `<Textarea>`,
`<SelectTrigger>` and `<NativeSelect>` so every control is pixel-identical.

| Spec | Value |
|---|---|
| Height | 48px (`sm` select: 38px) |
| Padding | 15px horizontal; textarea 13px vertical |
| Text | 15.5px / 400 / `tx-body` / `tracking-ui` — **16px below 640px**, see below |
| Radius | `rounded-control` |
| Border | 1px `line-strong` at rest — **always visible, never borderless** |
| Inner shadow | `shadow-lift-in` — the field reads as a container |
| Placeholder | `tx-faint` — an example, never a replacement for the label |
| Hover | border → `line-hover` |
| Focus | border → `ocean`, plus a 3px ocean ring at 12% |
| Error | `aria-invalid` → rose border + 3px rose ring at 10% |
| Disabled | `sunk` fill, faint text, no shadow, not-allowed cursor |
| Leading icon | 18px at 14px from the left; field padding becomes 42px (`<Input leadingIcon={…}>`) |
| Textarea | min 96px, resize vertical only |

**The one deviation from the scale.** iOS Safari zooms the whole viewport when you focus a
field whose text is under 16px, and 15.5px lands just the wrong side of that line. So fields
are `text-base sm:text-[15.5px]` — 16px on phones, the scale value from 640px up. A base rule
in `globals.css` holds raw `<input>`/`<textarea>`/`<select>` at 16px on phones too, but a
utility beats it, so any hand-styled field must restate `sm:text-sm` rather than plain `text-sm`.

**Two heights, and only two.** 48px is the form field. 38px is the compact one — a filter
bar, never a form — and every control answers to the same prop: `<Input size="sm">`,
`<NativeSelect size="sm">`, `<SelectTrigger size="sm">`, `<Button size="sm">`. That is what
lets a filter row line up without anyone nudging a margin.

**`<Field>`** (`components/ui/field.tsx`) — label → hint → control → error, at the locked
8px / 8px / 8px spacing. `<FieldGroup>` stacks fields 22px apart.

- **Label** 600 · 13.5px · `tx-head` · sentence case. Required = coral asterisk, never "(required)".
- **Hint** 13px · `tx-muted`, between label and field.
- **Error** 13px · `rose`, with a 15px icon, 8px below the field.
- **Error copy says what to do next:** *"Add a date so we can check the fare."* — not *"Invalid input"*.

**`<ChoiceCard>`** — full-width tappable card around a real checkbox/radio.
13px/15px padding, 11px gap, 19px box at 5px radius (radio: circle).
Selected = ocean border + sky-tint fill + 1px ocean ring. Title 15px/500 `tx-head`,
description 13px `tx-muted`.

---

## 10. Badges — `components/ui/badge.tsx`

6px radius, **squared like a printed label — never a pill**. 12.5px at 600, tracking −0.002em,
padding 5px 11px, 7px gap, 1px border in a darker tint of the same hue.
A 6px dot (`dot` prop) only where a live state matters.

Variants: `mint` (confirmed) · `sky` (new) · `amber` (in progress) · `indigo` (awaiting reply) ·
`rose` (cancelled) · `coral` (featured) · `neutral` · `outline` · `solid`.

---

## 11. Cards, panels, sections

- **`<Card>`** — white, 1px `line`, `rounded-surface`, `shadow-lift`. Padding 26/28 desktop, 20/22 mobile; `size="sm"` for portal density. `CardTitle` is H4; `CardDescription` is Small; `CardFooter` sits on `sunk` with a `line-faint` rule.
- **`<Panel>`** — the same surface without the header/content/footer scaffolding, for tables and lists that manage their own padding.
- **`<Section tone="canvas | white | sky | ocean">`** — 96/72/56 vertical rhythm, alternating backgrounds, 1px rules where the background changes, and the card-shadow rule for `white`.
- **`<SectionWrap>`** — 1160px max, 40/24px gutters.
- **`<SectionHead eyebrow title lede>`** — the locked 12 / 14 / 32px rhythm.

---

## 12. Page rhythm

1. **Eyebrow** — Plex Mono 11px, `coral-deep`, carrying a fact (a date, a count, a route)
2. **Heading** — H2, left-aligned, one line where possible
3. **Lede** — one or two sentences, max 58 characters wide
4. **Content** — the actual thing: stubs, cards, a table, a form
5. **Close** — one action, or nothing

Vary column counts (2-up, then a wide single, then 3-up). Four identical 3-column grids is the tell.
Left-align by default; centre only inside an ocean statement band.
Marketing pages breathe; portal screens tighten to 72px sections and 20px card padding.

---

## 13. Motion

| Aspect | Value |
|---|---|
| Micro (hover, focus, press) | 160ms |
| Entrance | 260ms, 10px rise + fade, **once only** |
| Easing | `cubic-bezier(.22,.68,.28,1)` — `ease-brand` |
| Properties | transform, opacity, box-shadow, border-color. Nothing that forces layout. |
| Stagger | max 60ms, max 4 items |
| Cards rise | 2px on hover. Buttons don't rise — they deepen. |
| Reduced motion | `prefers-reduced-motion` disables all of it (already global) |

**Banned:** parallax, blobs, typewriter text, counting numbers, background loops, scroll-jacking.

---

## 14. Portal shell — `components/portal/portal-shell.tsx`

Admin and employee share one shell. The rail owns the brand; nothing above the content
does.

### Sidebar — 272px

| Part | Spec |
|---|---|
| Surface | `linear-gradient(180deg, ocean 0%, ocean-deep 44%, ocean-night 100%)` |
| Brand | 46px `<Monogram tone="light">`, brand name at 16.5/700, portal name below as a `font-micro` label at white 48% |
| Group header | Plex Mono 9.5px · 0.17em · uppercase · white 48% |
| Nav row | 46px tall · `rounded-icon` (12px) · 20px Lucide at 1.75 · 13px gap · white 86% |
| Hover | white 9% |
| **Active** | solid white pill · `ocean-deep` label · **coral-deep icon** · `shadow-lift` |
| Count | `rounded-chip`, tabular; white 14% idle, `sky-tint`/`ocean` on the active pill |
| Foot | 1px white-12% rule, then sign out on the same 46px row |

Nav is grouped by giving consecutive `NavItem`s the same `group` string. An item with no
group sits at the top with no header — that is where the dashboard lives.

### Topbar — 72px

Sticky, `surface`, one 1px `line` rule underneath, and **no brand colour** — icon controls
are `tx-muted` on a `sunk` hover, and the unread count is `rose`, which is a data hue, not
the brand. Controls are 46px square on `rounded-icon`. The avatar is the one circle in the
system.

The title on the left is **wayfinding, not the page's heading**: it is derived from the nav
registry (longest matching href, so `/admin/orders/7343490` still reads "Orders") and
rendered as a `<p>` at 19–21px. The screen's real `<h1>` stays in `<PageHeader>`, where it
can carry an eyebrow and a lede. Two 32px titles twenty pixels apart shout twice.

### Mobile

Below `md` the rail becomes a left drawer: 272px, a 260ms `ease-brand` slide, an
`ocean-night/32` scrim fading with it, body scroll locked, dismissed by the X, the scrim or
Esc. Focus trapping and the scroll lock come from Base UI, not from us. Every target in it
is at least 44px.

---

## 15. Screen patterns

Built once so screens inherit them instead of each inventing its own.

| Pattern | Where | Notes |
|---|---|---|
| `<PageHeader eyebrow title subtitle actions>` | `components/admin/page-header.tsx` | Eyebrow → H1 → lede → action, at 12/14. H1 steps to the H2 size below 640px. |
| `<FilterBar>` + `FilterSearch` `FilterChips` `FilterSelect` `FilterDate` | `components/portal/filter-bar.tsx` | One 38px row that wraps rather than scrolls, growing to 44/48px below `sm` for thumbs. Selected chip is a white surface on a `sunk` track — sky tint would vanish against it. |
| `<DataTable columns rows>` | `components/portal/data-table.tsx` | One column definition, two renderings: a real table from `md`, `<MobileRecordCard>`s below it. Loading, empty and error are states of the component, not branches each screen rewrites. Announces its row count politely, so filtering isn't silent. |
| `<EmptyState>` · `<ErrorState>` | `components/portal/states.tsx` | Icon chip, H4, one line, at most one action. |
| `<Pagination page pageSize total>` · `<LoadMoreFooter>` | `components/portal/pagination.tsx` | Previous/next plus a tabular range, or a list that grows in place — same footer surface either way. |
| `<OrdersTable rows>` | `components/admin/orders-table.tsx` | The order row, defined once. Server screens can't pass `<DataTable>` its cell functions across the RSC boundary, so they hand plain rows to this. |
| Skeletons | `components/portal/skeletons.tsx` | Same surface, radius and rhythm as the real thing, so nothing jumps. |
| `<Dialog>` | `components/ui/dialog.tsx` | `rounded-surface-lg`, `shadow-lift-lg`, `ocean-night/32` scrim, 260ms entrance. |
| Toast | `.cn-toast` in `globals.css` | Sonner portals outside the tree, so its skin lives in CSS. Popup surface: clipped corner, lift-2, icon in the hue of what it says. |

**Table anatomy** — header row on `sunk` with Plex Mono micro-labels, 1px `line-faint`
dividers, 14px of vertical air per cell, `sky-tint` row hover, and `numeric` on any column
of money, counts or dates so the numerals go tabular.

---

## 15a. Composites

| Composite | Where | Anatomy |
|---|---|---|
| `<StatCard tone label value icon hint>` | `components/admin/stat-card.tsx` | 42px icon chip → Plex Mono micro-label → 30px tabular metric → 13.5px caption, in a 24/22 box. **The tone is the meaning, never the variety**: `ocean` volume · `amber` money · `indigo` waiting · `mint` confirmed · `rose` attention · `coral` featured. The wash is the hue's tint fading to white at 62% on a 155° axis, bordered in its `-line` token. |
| `<FareStub from to caption meta fare>` | `components/portal/fare-stub.tsx` | The signature. Route codes in Plex Mono 25px, coral plane between them, up to three facts along the foot, and the fare on a tear-off stub behind a 2px dashed perforation with a 22px notch punched through each end. Below 620px the tear turns horizontal and the fare drops underneath. **One per screen** — it is the booking, not a frame for other content. |
| `<OrderStatusBadge status>` | `components/admin/status-badge.tsx` | The order lifecycle, badged once: `new` sky · `in_progress` amber with a live dot · `completed` mint · `cancelled` rose. |

The fare stub's notch is filled with the page behind it (`--stub-notch`, default `canvas`),
so it only reads as torn when it sits on the page rather than inside a card.

---

## 16. Ship checklist

**Never again**

- Plus Jakarta Sans, Inter or Poppins
- `#F97316`, `#1E3A5F`, `#0088CC`, `#F8FAFC` or any framework default colour
- Uniform 16px radius, pill buttons, pill eyebrows
- Weight 800 with tight tracking
- Pure black or near-black body text on long paragraphs
- Borderless inputs that only appear when focused
- The same shadow on every element
- Emoji as icons, or two icon libraries
- Centred heading + three identical cards, repeated down the page
- "Seamless", "elevate", "unlock", "revolutionise"

**Always**

- Hanken Grotesk 400–700; Newsreader italic once per page; Plex Mono for codes
- The clipped corner — 5/18/18/18 surfaces, 8 controls, 6 badges
- Five text colours: `#0A3A66` · `#37485C` · `#6B7C8E` · `#98A6B5` · `#FFFFFF`
- Line-height 1.7 on body, tracking at or near zero
- Visible input borders at rest, with a real inner shadow
- Lucide at 1.75, in tinted chips that match the metric's meaning
- Alternating section backgrounds and varied column counts
- Errors that say what to do next
- One coral action per view — everything else is ocean or secondary
- Copy that states a fact

---

## 17. Order of work

1. ✅ Tokens, fonts and base CSS
2. ✅ Primitives — button, input, textarea, select, field, choice, badge, icon chip, card, panel, section
3. ✅ Shell + shared furniture — sidebar, topbar, drawer, page header, filter bar, data table, states, modal, toast, pagination
4. ✅ Auth screens
5. ✅ Composites — fare stub, stat card, order status badge
6. ⏳ Screens, one at a time — adopting `<DataTable>`, `<FilterBar>` and the state components as each is reached
   - ✅ Admin: dashboard, orders, transactions, order detail, customers (list + detail)
   - ⏳ Admin: employees, messages, analytics, visa queries, parents tickets, support, settings
   - ⏳ Employee portal · Customer portal

Restyling screens before the primitives exist leaves the old values alive in a hundred places.
