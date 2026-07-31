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

### Legacy aliases

Screens not yet restyled still use the pre-2026 names. They now resolve to the locked
palette, so nothing renders off-brand: `brand`→ocean, `navy`→ocean-deep, `navy-dark`→ocean-night,
`navy-light`→ocean, `orange`→coral-deep, `orange-dark`→coral-press, `orange-light`→coral,
`chip`→sky-tint, `neutral-soft`→sunk. **Do not use these in new code.**

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

*Exception:* `components/icons/google.tsx` keeps Google's four brand colours — it is a third-party mark, not an icon.

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
| Text | 15.5px / 400 / `tx-body` |
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

## 14. Ship checklist

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

## 15. Order of work

1. ✅ Tokens, fonts and base CSS
2. ✅ Primitives — button, input, textarea, select, field, choice, badge, icon chip, card, panel, section
3. ⏳ Composites — fare stub, stat card
4. ⏳ Screens, one at a time

Restyling screens before the primitives exist leaves the old values alive in a hundred places.
