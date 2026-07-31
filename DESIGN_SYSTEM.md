# Wicket Travel — Design System v3 (Locked)

**This file is the source of truth for code.** The in-app specimen is
`/style-guide`. **v3 replaces v2 entirely** (§17) — if a value here disagrees
with anything in `wicket-design-system-v2.html`, `design-system.html` or an
older comment, this file wins.

Read this before touching anything visual.

---

## The one-paragraph version

**Warm paper, deep ocean, one flame.** The room is warm sand, the structure is
deep blue, and a single orange does the asking. Warmth comes from the
**neutrals** — not from tinting everything orange. Display type is a serif
(Fraunces) and appears only at title sizes; everything else is Manrope. One
radius per element type. No gradients, no visible scrollbars, no asymmetric
corners, no pills.

---

## 0. What changed from v2, and why

v2 was internally consistent and completely anonymous. These are the defects it
shipped, all corrected here:

| Defect in v2 | Correction in v3 |
|---|---|
| Canvas `#F5F8FC` — a cold blue-grey room that read clinical | Canvas `#FAF7F3`, warm sand. White cards now read as *lifted* without a shadow saying so. |
| One anonymous UI face doing every job | Fraunces for display, Manrope for UI. The serif is what gives the product a voice. |
| Sidebar: 44px rows on 4px gaps under a 9px label | 48px rows on 6px gaps under a 10px label. Nothing was removed — the rail simply breathes. |
| `--tx-muted` failed 4.5:1 on six of its own tints | Muted is set at the darkest tint it can land on. Every pairing in §3 is verified. |
| Blue hover on every table row | Warm hover. Blue now means *selected* only, so the two states are distinguishable. |
| `tx-faint` used for placeholders and labels | `tx-faint` is **non-text only**. Placeholders use `tx-muted`. |

---

## 1. Typefaces

Three faces, three jobs, no overlap.

| Face | Job | Weights |
|---|---|---|
| **Manrope** | Every piece of interface: body, labels, buttons, table text, nav, section headings | 400–800 (variable) |
| **Fraunces** | **Display only** — page titles (`h1`), stat metrics, auth headlines, empty-state headings | 600 / 700 (variable) |
| **IBM Plex Mono** | Codes, booking references, timestamps, uppercase micro-labels | 500 |

**The Fraunces rule.** It goes on display-size type **only** — nothing under
~20px. The optical cut falls apart at small sizes and starts to look like a
wedding invitation. Never on a button, a label, a table cell or a badge.

Opt in with the `font-display` utility (or `font-metric`, which adds tabular
figures for numbers). `h1` gets it automatically from the base rule. Axes are
pinned: `SOFT 24` rounds the terminals so it reads warm, `WONK 0` keeps the tame
letterforms so it never reads as novelty.

Retired: Hanken Grotesk, Newsreader, Plus Jakarta Sans, Inter, Poppins.

---

## 2. Type scale

Sizes not on this scale don't go on a screen.

| Role | Face | Size / line | Weight | Tracking |
|---|---|---|---|---|
| Page `h1` | Fraunces | 36 / 40 (27 / 32 under 640px) | 600 | −0.022em |
| Statement headline | Fraunces | 38–43 / 1.12 | 600 | −0.022em |
| Stat metric | Fraunces | 34 / 1.1, tabular | 600 | −0.022em |
| Section `h2` | Manrope | 21 / 27 | 700 | −0.014em |
| Card title `h3` | Manrope | 16.5 / 24 | 700 | −0.014em |
| Body | Manrope | 16 / 27 | 400 | 0 |
| Small / table | Manrope | 14.5 / 23 | 400 | 0 |
| Field text | Manrope | 15.5 (16 under 640px) | 500 | 0 |
| Button | Manrope | 15 | 700 | 0 |
| Label | Manrope | 13.5 | 700 | 0 |
| Micro-label | Plex Mono | 11 / 1.5, uppercase | 500 | 0.11em |

**Tracking is not a free parameter.** Manrope is even enough at UI sizes that
`tracking-ui` is `0`. Only display type (Fraunces) and micro-labels (Plex Mono)
carry a tracking value.

---

## 3. Colour tokens

**Never hardcode a hex.** Consume tokens (`bg-ocean`, `text-flame`,
`text-tx-head`, `bg-sand`, `border-line`…). The two documented exceptions are
in §8.

### Structure — blue

| Token | Hex | Use |
|---|---|---|
| `ocean` | `#12547F` | Brand blue, secondary buttons, links, focus rings |
| `ocean-deep` | `#0D4166` | Hover step, active nav text |
| `ocean-ink` | `#082F4B` | **Sidebar base**, ocean statement panels |
| `sky-tint` | `#ECF3F9` | Volume stat cards, selected rows, `sky` badges |
| `sky-line` | `#D2E3F1` | Border on any sky surface |
| `sky-chip` | `#DBE9F5` | Icon-chip fill on a sky card |

### Action — orange. **Two roles, not interchangeable.**

| Token | Hex | Use |
|---|---|---|
| `flame` | `#C24310` | **The accessible fill.** White on it clears 4.5:1 — the only orange allowed as a button or under small text. One primary per view. |
| `flame-hover` | `#A5380C` | The one hover step |
| `flame-vivid` | `#F0761C` | **Graphics only** — icons on dark panels, accents. Fails AA for small text on white. |
| `flame-tint` / `flame-line` / `flame-chip` | `#FDF0E6` / `#F6D6BC` / `#FBE2CE` | Tint surfaces |

### Data hues — the hue is fixed by meaning

| Token | Hex | Means |
|---|---|---|
| `gold` | `#975F0A` | money — revenue, commission, order value |
| `jade` | `#0B6F5F` | live, confirmed, completed, online |
| `violet` | `#4B4BB8` | waiting — pending, unassigned, awaiting reply |
| `ruby` | `#A82A3F` | attention — cancelled, failed, overdue |

Each carries `-tint`, `-line` and `-chip` steps. Never pick a hue for variety.

### Surfaces & lines — warm

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FAF7F3` | Page background |
| `surface` | `#FFFFFF` | Cards, panels, topbar |
| `sand` | `#F6F1EA` | Table heads, field fills, hover states, banded sections |
| `sand-deep` | `#EDE5DA` | Hover on something already sitting on `sunk` |
| `sunk` | `#F3EEE8` | Recessed wells, disabled fills |
| `line-faint` / `line` / `line-strong` / `line-hover` | `#F1EBE4` / `#E8E0D7` / `#D8CCBF` / `#C6B7A7` | internal · card & section · interactive · hover |

### Text

| Token | Hex | Use |
|---|---|---|
| `tx-head` | `#17293A` | Headings, metrics, emphasis |
| `tx-body` | `#4A5563` | Body copy, table cells |
| `tx-muted` | `#606A78` | Captions, micro-labels, placeholders, stat labels |
| `tx-faint` | `#8B95A1` | **NON-TEXT ONLY** — decorative icons, em-dash placeholders, separators. Does not clear AA at any size. |
| `tx-invert` / `-2` / `-3` | `#FFFFFF` / `#C5DAEA` / `#A7C3D9` | On ocean surfaces |

**Contrast is verified, not assumed.** `tx-muted` is deliberately set at the
darkest of the six tints it can land on, so a stat label clears 4.5:1 on jade
*and* violet *and* gold without a per-tone override. If you add a tint, re-check
it.

---

## 4. Radius — one value per element type

| Token | Value | Applies to |
|---|---|---|
| `rounded-surface` | 16px | cards, panels, stat cards, table containers, images |
| `rounded-surface-lg` | 22px | modals, hero panels, auth cards |
| `rounded-control` | 12px | buttons, inputs, selects, nav items |
| `rounded-icon` | 12px | icon chips, the monogram badge |
| `rounded-chip` | 8px | badges and tags — **squared, never a pill** |
| `rounded-full` | circle | **avatars and status dots only** |

**Banned:** asymmetric radii, pill buttons, pill eyebrows. Tailwind's own
`rounded-*` aliases are pinned onto these five values in `globals.css`, so a
stray `rounded-xl` from a shadcn primitive still lands on a system corner.

---

## 5. Depth

Shadows are **warm-tinted** (brown-black), never blue and never neutral black —
a cold shadow punches a hole in the sand canvas.

| Token | Use |
|---|---|
| `shadow-lift` | Cards, popovers. Faint by design — on sand, white already reads as lifted; the border does the real work. |
| `shadow-lift-lg` | Modals, dropdowns, toasts |
| `shadow-lift-in` | Inset on form fields |

**Buttons carry no shadow and never rise.** Only cards do.

---

## 6. Scrolling — no scrollbar is ever visible

Hard rule, no exception.

| Where | Rule |
|---|---|
| Page | The document scrolls as one. Do not create nested scroll containers for layout. |
| Sidebar | `sticky`, `100dvh`, `overflow-y auto` — **with the scrollbar hidden**. |
| Tables | Never scroll horizontally on mobile — `<DataTable>` stacks into `<MobileRecordCard>`s below `md`. |
| Filter rows | Wrap. They never scroll sideways. |
| Modals & chat | Scroll silently. No track, no arrows, no edge shadow. |

**Enforcement** — `globals.css` applies `scrollbar-width: none`,
`-ms-overflow-style: none` and `::-webkit-scrollbar { display: none }` to
`*:not(html):not(body)`. The `no-bar` utility states the same intent at a call
site.

**Test for it:** open every screen at 1280px and at 375px.

---

## 7. Spacing

4px grid: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72**.

| Relationship | Value |
|---|---|
| Portal page sections | **32px** between blocks (`space-y-8`) |
| Content padding | 36px top desktop / 48px large · 24px mobile |
| Container | **1180px** max · 40px gutters desktop · 24px mobile |
| Grid gap | 20px |
| Card padding | 26/24px desktop · 20px mobile |
| Page header | eyebrow → h1 14px · h1 → lede 14px · **32px rule underneath** |
| Label → input | 7px · field → field 20px · input → error 7px |
| Sidebar | 48px rows · 6px between rows · 28px between groups |
| Icon → label | 8px in buttons · 14px in nav |
| Table cell | 16px vertical · 16px horizontal |

**The rhythm rule:** space between groups is always larger than space inside a
group. This is the rule v2's sidebar broke.

---

## 8. Icons

- **lucide-react, exclusively.** No emoji, no filled icons, no second set.
- **Stroke 1.75 at every size** — set globally in `globals.css` (`svg.lucide`).
- **Sizes:** 16 inline · 17 buttons · 19 nav & chips · 22 page headers.
- Colour inherits text colour; inside a chip it takes the semantic hue.

**Icon chip** — `<IconChip tone="…">`: 40px, `rounded-icon`, a **flat** `-chip`
fill, 19px icon. Tones: `ocean` · `flame` · `gold` · `jade` · `violet` · `ruby` ·
`neutral`.

**The only two places a hex may appear outside `globals.css`:**

1. `components/icons/google.tsx` — Google's four brand colours. A third-party mark must be reproduced exactly.
2. `lib/design/brand.ts` — `BRAND.ocean` / `BRAND.flame`, for the few places that cannot reach a CSS variable: hex shown to a user as literal copy, canvas/PDF output, outbound email. Never import it to style a DOM node.

---

## 9. Buttons — `components/ui/button.tsx`

Type: Manrope 700 · 15px · no tracking. Never uppercase. Radius
`rounded-control` (12px). Icon 17px, 1.75 stroke, 8px gap, leading side.

| Variant | Fill | Text | Hover |
|---|---|---|---|
| `default` (primary) | `flame` | white | `flame-hover` — **one per view** |
| `accent` | alias of `default`, kept for older call sites | | |
| `ocean` | `ocean` | white | `ocean-deep` — the strong secondary |
| `secondary` / `outline` | white, 1px `line-strong` | `tx-head` | `line-hover` border + **sand** fill |
| `ghost` | transparent | `ocean-deep` | **sand** |
| `destructive` | `ruby-tint`, `ruby-line` border | `ruby` | solid ruby, white text |
| `link` | none | `ocean` | underline, 3px offset |

Quiet variants hover onto **sand**, not sky-tint: on a warm canvas a cool blue
wash reads as a selection state rather than a hover.

| Size | Height | Padding |
|---|---|---|
| `sm` | 38 | 14 |
| `default` | 44 | 18 |
| `lg` | 50 | 22 |
| `xs` | 32 | 12 |
| `icon` / `icon-sm` / `icon-xs` / `icon-lg` | 44 / 38 / 32 / 50 square | — |

**States** — hover darkens the fill by one step. **No shadow, no lift.** Active
`translate-y-px`. Focus `outline 2px flame at 2px offset`. Disabled `opacity .42`,
`cursor-not-allowed`. Every button carries `cursor-pointer`.

**Buttons never stretch to fill a container.** The only exception is the submit
button in an auth card.

---

## 10. Form fields

`components/ui/input.tsx` exports `fieldClassName`, shared by `<Input>`,
`<Textarea>`, `<SelectTrigger>` and `<NativeSelect>` so every control is
pixel-identical.

| Spec | Value |
|---|---|
| Height | 48px (`sm`: 38px) |
| Padding | 14px horizontal; textarea 13px vertical |
| Text | 15.5px / 500 / `tx-head` — **16px below 640px** |
| Radius | `rounded-control` (12px) |
| Fill | **`sand`** at rest → white on focus |
| Border | 1px `line-strong` at rest — **always visible, never borderless** |
| Inner shadow | `shadow-lift-in` |
| Placeholder | `tx-muted`, 400 weight — an example, never a replacement for the label |
| Hover | border → `line-hover` |
| Focus | border → `ocean`, white fill, plus a 3px ocean ring at 13% |
| Error | `aria-invalid` → ruby border + 3px ruby ring at 10% |
| Disabled | `sunk` fill, faint text, no shadow, not-allowed cursor |
| Leading icon | 17px at 14px from the left; field padding becomes 42px |
| Textarea | min 96px, resize vertical only |

**Why the fill is sand.** On a white card a white field is invisible until you
hover it. The warm wash tells you at a glance what is editable. It follows that
**a form must sit on white** — a sand field on the sand canvas has no edge,
which is why the auth screens use a white card.

**Two heights, and only two.** 48px is the form field. 38px is the compact one —
a filter bar, never a form — and every control answers to the same prop:
`<Input size="sm">`, `<NativeSelect size="sm">`, `<SelectTrigger size="sm">`,
`<Button size="sm">`.

**`<Field>`** — label → hint → control → error, at the locked 7px spacing.
`<FieldGroup>` stacks fields 20px apart. Required = flame asterisk, never
"(required)". **Error copy says what to do next:** *"Add a date so we can check
the fare."* — not *"Invalid input"*.

---

## 11. Badges — `components/ui/badge.tsx`

8px radius, **squared like a printed label — never a pill**. 12.5px at 600,
padding 5px 11px, 6px gap, 1px border in a darker tint of the same hue. A 6px
dot (`dot` prop) only where a live state matters.

Variants: `sky` (new) · `gold` (in progress) · `violet` (awaiting reply) ·
`jade` (completed) · `ruby` (cancelled) · `flame` (featured) · `neutral` ·
`outline` · `solid`.

---

## 12. Cards, panels, sections

- **`<Card>`** — white, 1px `line`, `rounded-surface`, `shadow-lift`. Padding 26/24 desktop, 20 mobile; `size="sm"` for portal density.
- **`<Panel>`** — the same surface without the header/content/footer scaffolding.
- **`<Section tone="canvas | white | sky | ocean">`** — alternating backgrounds, 1px rules where the background changes, and the card-shadow rule for `white`. `ocean` is **solid ocean ink**.
- **`<SectionWrap>`** — 1180px max, 40/24px gutters.
- **`<PageHeader>`** — eyebrow → h1 → lede → actions, with a **hairline rule underneath**. That rule is what separates a screen's header from its content without wrapping it in a card.

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

### Sidebar — 280px

| Part | Spec |
|---|---|
| Surface | **Solid `ocean-ink` `#082F4B`.** No gradient, no overlay, no texture. |
| Scroll | Sticky, 100dvh, `overflow-y auto` **with the scrollbar hidden** |
| Brand | 44px flame `<Monogram>`, wordmark in Fraunces 19/600, portal name below in Plex Mono 9.5px / 0.15em at white 55%, then a `white/10` hairline |
| Nav padding | `px-4 pt-6 pb-6` |
| Row | **48px**, `rounded-control`, `px-3.5`, 14.5px, 19px icon, 14px gap |
| Between rows | **6px** |
| Between groups | **28px** |
| Group label | Plex Mono **10px** / 0.15em / white 45%, 12px below it |
| Active | solid **white** pill, `ocean-deep` bold text, **flame** icon |
| Idle → hover | white 80% → `white/9%` fill, white text |
| Badge | `rounded-chip`, flame fill when active, `white/16` when not |
| Sign out | pinned to the foot behind a `white/10` hairline |

The v2 rail failed because 44px rows on 4px gaps under a 9px label read as a
wall of text. **The gaps are the design.** Do not tighten them to fit more in.

### Topbar — 76px

White, sticky, one hairline underneath, **no brand colour**. Page title in
Manrope 700 at 17–18.5px — deliberately *not* Fraunces, because the screen's
real `h1` in `<PageHeader>` is the serif one and two display titles twenty
pixels apart compete. Controls: notifications bell, help, avatar menu.

### Mobile

Below `md` the rail becomes a slide-in `<Sheet>` at 280px / 86vw max. The
skip-link is the first tab stop on every screen.

---

## 15. Screen patterns

| Pattern | Shape |
|---|---|
| Index | `<PageHeader>` → filter bar → `<DataTable>` → pagination |
| Detail | back link → identity block → 2-up: main column + rail |
| Dashboard | `<PageHeader>` → stat grid → wide table → 2-up feed + totals |
| Auth | ocean statement panel + white form card on sand (§16) |
| Empty | icon chip → Fraunces heading → one line of copy → one action |

### Stat card — `components/admin/stat-card.tsx`

Icon chip (40px) → Plex Mono micro-label in `tx-muted` → **34px Fraunces
tabular metric** → caption. Solid tint background with a 1px border one step
darker in the same family. **No shadow** — these sit in the page, not above it.

The metric is the one place display type belongs on a data-dense screen: it is
big, it is the point of the card, and it is what makes a dashboard feel
authored.

---

## 16. Auth screens — `components/auth/auth-shell.tsx`

Asymmetric split, `1.08fr / 1fr`. A 50/50 split gave the form column more room
than a 440px card could use, so the card sat marooned in it.

**Statement panel** (`lg` and up) — solid `ocean-ink`, vertically centred:
brand lockup → micro eyebrow → 38–43px Fraunces headline capped at 16ch → lede
at 38ch → hairline → **three proof rows** with icon chips. Depth comes from two
large outlined rings bled off the bottom-right corner — flat strokes, no
gradient, no texture. Below `lg` the panel is not rendered.

**The eyebrow must not repeat the wordmark.** The lockup already says "Wicket
Travel"; the eyebrow carries a category ("The travel desk", "Start here",
"Account recovery").

**Form column** — a **white card** on the sand canvas: `rounded-surface-lg`,
1px `line`, `shadow-lift`, 32/40px padding, 440px max. The card is structural,
not decorative: fields are sand, and sand on sand has no edge.

`<AuthHeading>` — eyebrow → 32px Fraunces `h1` → lede. The submit button is the
one button in the system allowed to stretch full-width.

---

## 17. Retired — do not reintroduce

- **v2 tokens:** canvas `#F5F8FC`, ocean `#0F4C81`, flame `#D24417`, lines `#E5EBF3`/`#D3DCE7`, text `#0C3355`/`#3A4A5C`/`#6D7D8F`/`#96A4B4`, gold `#C97A0C`, jade `#0C7A6B`, violet `#4A4FBF`, ruby `#B32F44`.
- **v2 geometry:** 14/18/10/11/7 radii, 42px buttons, 46px fields, 272px rail, 72px topbar, 1160px container.
- **Faces:** Hanken Grotesk, Newsreader, Plus Jakarta Sans, Inter, Poppins.
- **v1 vocabulary:** `coral-deep`, `rose`, `font-editorial`, the clipped 5/18/18/18 corner, gradients of any kind.
- **Patterns:** blue hover on rows, `tx-faint` on text, pill anything, visible scrollbars, dark mode.

---

## 18. Ship checklist

Before a screen is done:

- [ ] One flame primary action, and only one.
- [ ] Every colour comes from a token — no hex outside the two exceptions in §8.
- [ ] Fraunces appears only at display sizes; nothing under 20px is serif.
- [ ] Radii are on the five-value scale; nothing is a pill except an avatar or dot.
- [ ] Every text/background pair clears 4.5:1 — including labels on tinted stat cards.
- [ ] `tx-faint` carries no text.
- [ ] Focus is visible on every interactive element; the skip-link works.
- [ ] Clickable things have `cursor-pointer`.
- [ ] No scrollbar is visible anywhere below `<html>`.
- [ ] No horizontal page scroll at 1440 / 1024 / 768 / 375px.
- [ ] Icons are Lucide at 1.75 and on the size scale.
- [ ] `prefers-reduced-motion` is respected (global, but don't fight it locally).
