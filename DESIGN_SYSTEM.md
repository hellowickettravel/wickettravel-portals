# Wicket Travel — Design System v2 (Locked)

**This file is the working source of truth for code.** It is extracted from
`wicket-design-system-v2.html`, which stays in place as the visual brief. The
in-app specimen is `/style-guide` (dev-open, admin-only in production), and it
is built from the real primitives, not from a copy of them.

**v2 replaces v1 entirely.** `design-system.html` and every token it named are
retired — see §17.

> No component file should ever contain a raw hex or a one-off pixel value.
> Consume the tokens. Light mode only — there is no dark theme.

Implementation lives in:

- `app/globals.css` — CSS variables in `:root`, surfaced as Tailwind utilities via `@theme inline`
- `app/layout.tsx` — the two typefaces via `next/font/google`
- `components/ui/*` — the primitives

---

## 0. The three corrections

v1 shipped three defects. They are not preferences, and they are why finished
screens looked cheap.

| Removed — v1 | Adopted — v2 |
|---|---|
| Gradient sidebar, gradient stat cards, gradient statement bands | **Solid fills only.** No gradient anywhere in the product, ever. |
| The clipped corner `5px 18px 18px 18px` | **One radius per element type** — 14 / 18 / 10 / 11 / 7. |
| Accent `#C0451F` — brown, muted, invisible | **Flame `#D24417`**, and it is now the *primary action* colour. |
| 46px buttons at 22px padding | 42px buttons at 18px padding. |
| Visible scrollbars inside panels | **No scrollbar is ever visible** inside the app. |

---

## 1. Typefaces

| Face | Role | Weights | Token |
|---|---|---|---|
| **Hanken Grotesk** | Everything — headings, body, UI | 400 · 500 · 600 · 700 (never heavier) | `font-sans`, `--font-hanken` |
| **IBM Plex Mono** | Airport codes, booking refs, timestamps, uppercase micro-labels | 500 only | `font-mono`, `--font-plex-mono` |

Retired for good: **Newsreader** (v1's editorial italic — it belongs on the
marketing site only, if at all), Plus Jakarta Sans, Inter, Poppins, Archivo.

---

## 2. Type scale

Locked values. If a size isn't on this list, it doesn't go on a screen.

| Name | Weight | Size / line-height | Tracking | Colour |
|---|---|---|---|---|
| H1 · page title | 700 | 30 / 35 (1.16) | −0.018em | `#0C3355` |
| H2 · section | 700 | 24 / 30 (1.25) | −0.014em | `#0C3355` |
| H3 · card title | 600 | 16.5 / 23 (1.42) | — | `#0C3355` |
| Body | 400 | 16 / 27 (1.68) | — | `#3A4A5C` |
| Small | 400 | 14.5 / 23 (1.6) | — | `#6D7D8F` |
| Caption | 400 | 13 / 20 (1.5) | — | `#96A4B4` |
| Metric | 700 | 29 / 33 (1.15) | −0.022em | `#0C3355`, tabular |
| Micro-label | Plex Mono 500 | 10–11 | 0.1em, uppercase | context |
| Button | 600 | 15 | −0.002em | per variant |
| Form label | 600 | 13.5 | −0.002em | `#0C3355` |

**Tracking tokens** — `tracking-display` (−0.02em) · `tracking-heading` (−0.015em) ·
`tracking-ui` (−0.002em, buttons/labels/field text) · `tracking-micro` (0.1em, Plex uppercase).

**Text colours — four, plus invert. Never pure black.**

| Role | Hex | Token |
|---|---|---|
| Heading | `#0C3355` | `text-tx-head` |
| Body | `#3A4A5C` | `text-tx-body` |
| Muted | `#6D7D8F` | `text-tx-muted` |
| Faint | `#96A4B4` | `text-tx-faint` |
| Invert | `#FFFFFF` | `text-tx-invert` — on ocean; body `#BBD2E6` (`tx-invert-2`), muted `#A9C5DD` (`tx-invert-3`) |

- **Link** `#0F4C81`, underline at 3px offset, 1px thickness.
- **Numerals** `tabular` utility on every fare, metric and table column.

Utilities: `font-micro`, `tabular`, `no-bar`.

---

## 3. Colour tokens

Every token exists both as a CSS variable (`var(--ocean)`) and a Tailwind
utility (`bg-ocean`, `text-ocean`, `border-ocean`).

### Structure — blue

| Token | Hex | Use |
|---|---|---|
| `ocean` | `#0F4C81` | sidebar, headings, links, structure, strong secondary button |
| `ocean-deep` | `#0C3D69` | ocean button hover |
| `ocean-ink` | `#0A3355` | statement bands, footers, code surfaces, heading colour |
| `sky-tint` | `#EDF4FB` | tint sections, ocean stat cards, hover states |
| `sky-line` | `#D3E4F4` | border on sky-tinted surfaces |

### Action — orange

**Flame is the primary action colour.** Every main button and every active nav
icon is flame, so the brand is visible on every screen.

| Token | Hex | Use |
|---|---|---|
| `flame` | `#D24417` | primary button, active nav icon, eyebrows, key numbers. 4.6:1 ✓ AA |
| `flame-hover` | `#B63A11` | primary button hover |
| `flame-vivid` | `#F2622A` | icons and graphics only — fails AA for small text |
| `flame-tint` | `#FFF0EA` | notes, featured chips |
| `flame-line` | `#FAD5C4` | border on flame tint |

### Data hues — the hue is fixed by meaning

| Token | Hex | Tint | Border | Chip fill | Meaning |
|---|---|---|---|---|---|
| `ocean` | `#0F4C81` | `#EDF4FB` | `#D3E4F4` | `#DCEAF7` | volume |
| `gold` | `#C97A0C` | `#FDF3E3` | `#F2DFBC` | `#F9E7C6` | money |
| `violet` | `#4A4FBF` | `#EEEFFC` | `#D8DAF8` | `#E1E3FA` | waiting |
| `jade` | `#0C7A6B` | `#E3F3F0` | `#C1E4DD` | `#CFE8E3` | live, confirmed |
| `ruby` | `#B32F44` | `#FCEDEF` | `#F5D0D6` | `#F7DADE` | attention, destructive, errors |
| `flame` | `#D24417` | `#FFF0EA` | `#FAD5C4` | `#FBDCCE` | featured |

The `-chip` fill sits one step deeper than the tint, so an icon chip still
separates when it sits on a stat card painted in that same hue.

### Surfaces & lines

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F5F8FC` | page background |
| `surface` | `#FFFFFF` | cards, panels, inputs, alternating sections |
| `sunk` | `#F0F4F9` | disabled fields, empty states, table header rows |
| `line-faint` | `#EFF3F8` | internal dividers |
| `line` | `#E5EBF3` | card & section borders |
| `line-strong` | `#D3DCE7` | inputs and anything interactive |
| `line-hover` | `#C3D2E1` | input border on hover (derived — the one token not in the brief) |

**The fill rule.** Every background in the product is a **single flat colour**.
No `linear-gradient`, no `radial-gradient`, no colour fading to white, no
tinted overlays, no `backdrop-blur`. If a surface needs separation, it gets a
1px border.

**Section rule** — alternate canvas → white → sky tint; never three of the same
in a row. An ocean-ink statement band once or twice per page.

---

## 4. Radius

Consistent per element type, and deliberately off the framework defaults of
8 / 12 / 16. **The clipped corner is gone.**

| Token | Value | Applies to |
|---|---|---|
| `rounded-surface` | `14px` | cards, panels, stat cards, table containers, images |
| `rounded-surface-lg` | `18px` | modals, the sidebar, hero panels, auth panels |
| `rounded-control` | `10px` | buttons, inputs, selects, nav items |
| `rounded-icon` | `11px` | icon chips and the monogram badge |
| `rounded-chip` | `7px` | badges and tags — **never a pill** |
| `rounded-full` | circle | avatars and status dots only (plus the radio indicator) |

Tailwind's own aliases are **pinned onto those five values** in `@theme inline`
(`rounded-sm`→7, `rounded-md`/`rounded-lg`→10, `rounded-xl`/`rounded-2xl`→14,
`rounded-3xl`→18), so a stray radius from a shadcn primitive still lands on a
system value. Prefer the semantic name at every call site you write.

**Banned:** asymmetric radii · 16px on everything · pill buttons · pill eyebrows.

---

## 5. Depth

| Token | Value | Use |
|---|---|---|
| `shadow-lift` | `0 1px 2px rgba(12,51,85,.05), 0 4px 12px rgba(12,51,85,.05)` | resting cards and panels |
| `shadow-lift-lg` | `0 2px 6px rgba(12,51,85,.06), 0 12px 26px rgba(12,51,85,.09)` | card hover (+2px rise), popovers, modals |
| `shadow-lift-in` | `inset 0 1px 2px rgba(12,51,85,.05)` | inputs |

**Buttons carry no shadow at all** and never rise — they darken one step on
hover. **Stat cards carry no shadow** — the border does the work.

**A card sitting on a white section keeps its border and drops its shadow.**
Enforced in `globals.css` via `[data-section-tone="white"] [data-slot="card"]`.

**Banned:** black shadows, `shadow-sm`/`md`/`lg` from the framework scale, glow,
glass blur, gradient borders.

---

## 6. Scrolling — no scrollbar is ever visible

A native scrollbar sitting inside the sidebar is the single most
brand-destroying detail on the screen. This is a hard rule with no exception.

| Where | Rule |
|---|---|
| Page | The document scrolls as one. Do not create nested scroll containers for layout. |
| Sidebar | `sticky`, `100dvh`, `overflow-y auto` — **with the scrollbar hidden**. |
| Tables | Never scroll horizontally on mobile — `<DataTable>` stacks into `<MobileRecordCard>`s below `md`. |
| Filter rows | Wrap. They never scroll sideways. |
| Modals & chat | Scroll silently. No track, no arrows, no edge shadow. |

**Enforcement** — `globals.css` applies `scrollbar-width: none`,
`-ms-overflow-style: none` and `::-webkit-scrollbar { display: none }` to
`*:not(html):not(body)`, so the browser's own page scrollbar is the only one
left in the product. The `no-bar` utility states the same intent at a call site.

**Test for it:** open every screen at 1280px and at 375px.

---

## 7. Spacing

4px grid: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72**.

| Relationship | Value |
|---|---|
| Portal section | 40px between blocks · 28px page top padding |
| Container | 1160px max · 40px gutters desktop · 24px mobile |
| Grid gap | 18px |
| Card padding | 20–24px desktop · 18px mobile |
| Eyebrow → H1 | 10px · H1 → lede 12px · header → content 28px |
| Label → input | 7px · field → field 20px · input → error 7px |
| Button row gap | 10–12px |
| Icon → label | 8px in buttons · 12px in nav |
| Table cell | 13px vertical · 18px horizontal |

**The rhythm rule:** space between groups is always larger than space inside a group.

---

## 8. Icons

- **lucide-react, exclusively.** No emoji, no filled icons, no second set.
- **Stroke 1.75 at every size** — set globally in `globals.css` (`svg.lucide`), so call sites don't pass `strokeWidth`.
- **Sizes:** 16 inline · 17 buttons · 19 nav & chips · 22 page headers.
- Colour inherits text colour; inside a chip it takes the semantic hue.

**Icon chip** — `<IconChip tone="…">`: 40px, `rounded-icon`, a **flat** `-chip`
fill, 19px icon. Tones: `ocean` · `flame` · `gold` · `jade` · `violet` · `ruby` ·
`neutral`.

**The only two places a hex may appear outside `globals.css`:**

1. `components/icons/google.tsx` — Google's four brand colours in a local `GOOGLE_BRAND` const. A third-party mark must be reproduced exactly.
2. `lib/design/brand.ts` — `BRAND.ocean` / `BRAND.flame`, for the few places that cannot reach a CSS variable: hex shown to a user as literal copy, canvas/PDF output, outbound email. Never import it to style a DOM node.

---

## 9. Buttons — `components/ui/button.tsx`

Type: Hanken Grotesk 600 · 15px · −0.002em. Never uppercase, never letterspaced.
Radius `rounded-control` (10px). Icon 17px, 1.75 stroke, 8px gap, leading side.

| Variant | Fill | Text | Hover |
|---|---|---|---|
| `default` (primary) | `flame` | white | `flame-hover` — **one per view** |
| `accent` | alias of `default`, kept for older call sites | | |
| `ocean` | `ocean` | white | `ocean-deep` — the strong secondary |
| `secondary` / `outline` | white, 1px `line-strong` | `tx-head` | ocean border + sky-tint fill |
| `ghost` | transparent | `ocean` | sky-tint |
| `destructive` | `ruby-tint`, `ruby-line` border | `ruby` | solid ruby, white text |
| `link` | none | `ocean` | underline, 3px offset |

| Size | Height | Padding |
|---|---|---|
| `sm` | 36 | 14 |
| `default` | 42 | 18 |
| `lg` | 48 | 22 |
| `xs` | 32 | 12 |
| `icon` / `icon-sm` / `icon-xs` / `icon-lg` | 42 / 36 / 32 / 48 square | — |

**States** — hover darkens the fill by one step. **No shadow, no lift.** Active
`translate-y-px`. Focus `outline 2px flame at 2px offset`. Disabled `opacity .42`,
no pointer events.

**Buttons never stretch to fill a container.** The only exception is the submit
button in an auth card.

---

## 10. Form fields

`components/ui/input.tsx` exports `fieldClassName`, shared by `<Input>`,
`<Textarea>`, `<SelectTrigger>` and `<NativeSelect>` so every control is
pixel-identical.

| Spec | Value |
|---|---|
| Height | 46px (`sm`: 36px) |
| Padding | 14px horizontal; textarea 13px vertical |
| Text | 15.5px / 400 / `tx-body` / `tracking-ui` — **16px below 640px** |
| Radius | `rounded-control` (10px) |
| Border | 1px `line-strong` at rest — **always visible, never borderless** |
| Inner shadow | `shadow-lift-in` |
| Placeholder | `tx-faint` — an example, never a replacement for the label |
| Hover | border → `line-hover` |
| Focus | border → `ocean`, plus a 3px ocean ring at 13% |
| Error | `aria-invalid` → ruby border + 3px ruby ring at 10% |
| Disabled | `sunk` fill, faint text, no shadow, not-allowed cursor |
| Leading icon | 17px at 14px from the left; field padding becomes 42px |
| Textarea | min 96px, resize vertical only |

**Two heights, and only two.** 46px is the form field. 36px is the compact one —
a filter bar, never a form — and every control answers to the same prop:
`<Input size="sm">`, `<NativeSelect size="sm">`, `<SelectTrigger size="sm">`,
`<Button size="sm">`.

**`<Field>`** — label → hint → control → error, at the locked 7px spacing.
`<FieldGroup>` stacks fields 20px apart. Required = flame asterisk, never
"(required)". **Error copy says what to do next:** *"Add a date so we can check
the fare."* — not *"Invalid input"*.

**`<ChoiceCard>`** — full-width tappable card around a real checkbox/radio.
Selected = ocean border + sky-tint fill + 1px ocean ring.

---

## 11. Badges — `components/ui/badge.tsx`

7px radius, **squared like a printed label — never a pill**. 12.5px at 600,
tracking −0.002em, padding 5px 11px, 6px gap, 1px border in a darker tint of the
same hue. A 6px dot (`dot` prop) only where a live state matters.

Variants: `sky` (new) · `gold` (in progress) · `violet` (awaiting reply) ·
`jade` (completed) · `ruby` (cancelled) · `flame` (featured) · `neutral` ·
`outline` · `solid`.

---

## 12. Cards, panels, sections

- **`<Card>`** — white, 1px `line`, `rounded-surface`, `shadow-lift`. Padding 24/22 desktop, 18 mobile; `size="sm"` for portal density.
- **`<Panel>`** — the same surface without the header/content/footer scaffolding.
- **`<Section tone="canvas | white | sky | ocean">`** — alternating backgrounds, 1px rules where the background changes, and the card-shadow rule for `white`. `ocean` is **solid ocean ink**.
- **`<SectionWrap>`** — 1160px max, 40/24px gutters.
- **`<SectionHead eyebrow title lede>`** — the locked rhythm.

---

## 13. Motion

| Aspect | Value |
|---|---|
| Micro (hover, focus, press) | 150ms |
| Entrance | 260ms, 10px rise + fade, **once only** |
| Easing | `cubic-bezier(.22,.68,.28,1)` — `ease-brand` |
| Properties | transform, opacity, box-shadow, border-color |
| Cards rise | 2px on hover. Buttons don't rise — they darken. |
| Reduced motion | `prefers-reduced-motion` disables all of it (already global) |

**Banned:** parallax, blobs, typewriter text, counting numbers, scroll-jacking.

---

## 14. Portal shell — `components/portal/portal-shell.tsx`

Admin and employee share one shell. The rail owns the brand; nothing above the
content does.

### Sidebar — 272px

| Part | Spec |
|---|---|
| Surface | **Solid `#0F4C81`.** No gradient, no overlay, no texture. |
| Scroll | Sticky, 100dvh, `overflow-y auto` **with the scrollbar hidden** |
| Brand | 44px `<Monogram tone="light">`, brand name at 16.5/700, portal name below in Plex Mono 9px / 0.16em at white 58% |
| Group header | Plex Mono 9px · 0.17em · uppercase · white 46% |
| Nav row | 44px tall · `rounded-control` (10px) · 19px Lucide at 1.75 · 12px gap · white 85% |
| Hover | white 10%. No movement. |
| **Active** | solid white pill · ocean label · **flame icon**. No shadow. |
| Count | `rounded-chip`, tabular; white 18% idle, `sky-tint`/`ocean` on the active pill |
| Foot | 1px white-15% rule, then sign out on the same 44px row |

### Topbar — 72px

Sticky, `surface`, one 1px `line` rule underneath, and **no brand colour** —
icon controls are `tx-muted` on a `sunk` hover, and the unread count is `ruby`,
which is a data hue, not the brand. Controls are 44px square on `rounded-icon`.
The avatar is the one circle in the system.

The title on the left is **wayfinding, not the page's heading**. The screen's
real `<h1>` stays in `<PageHeader>`.

### Mobile

Below `md` the rail becomes a 272px left drawer with a 260ms `ease-brand` slide
and an `ocean-ink/32` scrim. Every target in it is at least 44px.

---

## 15. Screen patterns

| Pattern | Where |
|---|---|
| `<PageHeader eyebrow title subtitle actions>` | `components/admin/page-header.tsx` |
| `<FilterBar>` + `FilterSearch` `FilterChips` `FilterSelect` `FilterDate` | `components/portal/filter-bar.tsx` — one 36px row that **wraps rather than scrolls** |
| `<DataTable columns rows>` | `components/portal/data-table.tsx` — a real table from `md`, `<MobileRecordCard>`s below it |
| `<EmptyState>` · `<ErrorState>` | `components/portal/states.tsx` |
| `<Pagination>` · `<LoadMoreFooter>` | `components/portal/pagination.tsx` |
| `<OrdersTable rows>` | `components/admin/orders-table.tsx` |
| Skeletons | `components/portal/skeletons.tsx` |
| `<Dialog>` | `components/ui/dialog.tsx` — `rounded-surface-lg`, `shadow-lift-lg`, `ocean-ink/32` scrim |
| Toast | `.cn-toast` in `globals.css` |

**Table anatomy** — header row on `sunk` with Plex Mono micro-labels, 1px
`line-faint` dividers, 13px of vertical air per cell, `sky-tint` row hover, and
`numeric` on any column of money, counts or dates.

### Composites

| Composite | Anatomy |
|---|---|
| `<StatCard tone label value icon hint>` | 40px icon chip → Plex Mono micro-label → 29px tabular metric → 13.5px caption, in a 22/20 box at 14px radius. **Flat tint background, 1px border one step darker, no shadow.** The tone is the meaning, never the variety. |
| `<FareStub from to caption meta fare>` | Route codes in Plex Mono, a flame plane between them, the fare on a tear-off stub. **One per screen.** |
| `<OrderStatusBadge status>` | `new` sky · `in_progress` gold with a live dot · `completed` jade · `cancelled` ruby. |

---

## 16. Ship checklist

**Reject the screen if**

- Any **gradient** appears — sidebar, card, button, panel or overlay
- A **scrollbar is visible** anywhere except the browser's own page scrollbar
- An **asymmetric or 16px-everywhere radius** is used
- The screen has **no flame** on it — the brand accent must appear at least once
- **Buttons stretch** to fill their container outside an auth card
- A **stat card has a shadow**, or a different padding from its neighbour
- **Status colours vary by screen** — money is gold everywhere, waiting is violet everywhere
- A **table scrolls sideways** on mobile instead of stacking

**The screen is ready when**

- Every fill is **one flat colour**, and separation comes from 1px borders
- **Scrolling is silent** at 1280px and 375px
- Radii are **14 / 18 / 10 / 11 / 7** by element type, circles only for avatars
- **The primary action is flame** and there is exactly one per view
- **Every number** in a metric, fare or column is tabular
- **Icons are Lucide at 1.75**, in tinted chips that match the metric's meaning
- Type follows the scale and body sits at `#3A4A5C`, 1.68 line-height
- **Tables stack into cards** below 768px with 44px tap targets

---

## 17. Retired names

There is one vocabulary now. If you meet any of these in an old branch or a
snippet, translate it. None of them resolve any more, so a stale one renders as
no style at all rather than as the wrong colour.

| v1 | v2 |
|---|---|
| `coral`, `coral-deep` | `flame` |
| `coral-press` | `flame-hover` |
| `coral-tint`, `coral-line` | `flame-tint`, `flame-line` |
| `amber`, `amber-deep` | `gold` |
| `mint` | `jade` |
| `indigo` | `violet` |
| `rose` | `ruby` |
| `ocean-night` | `ocean-ink` |
| `sky` (`#7EC3F0`) | gone — use white at an opacity on ocean |
| `shadow-btn-ocean`, `shadow-btn-coral` | gone — buttons carry no shadow |
| `font-serif`, `font-editorial`, `--font-newsreader` | gone — Newsreader is retired |
| `bg-dot-grid` | gone — no textures |
| `rounded-surface` = `5px 18px 18px 18px` | `rounded-surface` = `14px` |

Earlier still: `brand`→`ocean`, `navy`→`ocean-deep`, `orange`→`flame`,
`chip`→`sky-tint`, `neutral-soft`→`sunk`, `outline`→`line-strong`.

---

## 18. Order of work

1. ✅ Strip every gradient and every asymmetric radius from the codebase
2. ✅ Replace the v1 tokens with the v2 values
3. ✅ Rebuild the primitives — button, input, select, textarea, field, choice, badge, icon chip, card, panel, section, stat card
4. ✅ Sidebar and auth
5. ✅ Screens — framework-default colours, pills, stray shadows, glass blur, full-width buttons and sideways-scrolling filter rows swept out of admin, employee, customer and driver

Do not restyle screens before the gradients are gone, or they survive inside
components.
