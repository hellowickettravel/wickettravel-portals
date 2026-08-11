# Brief for Claude Code — Wicket Travel public homepage

*Paste everything below the line into Claude Code in the **homepage** repo
(`wicket-travel`, deployed at `https://wicket-travel.vercel.app`). Written from
the portal repo, where the design system and every API this site calls actually
live.*

---

You are rebuilding the **public marketing homepage** for Wicket Travel, a
UK-based flight-ticket reselling business. This repo is the public site only.
The customer/employee/admin/helper **portal is a separate deployment** at
`https://wicket-travel-portal.vercel.app` — you do not have its code and must
not try to change it. You call its public API and link into it; that is all.

## How I want you to work

Do not start writing components. Work in this order, and stop for my approval
between the audit and the build:

1. **AUDIT.** Read every file that renders or feeds the homepage. Produce a
   written report: what sections exist, what each one does, which are wired to
   a real API and which are decorative or fake, what's broken, what's dead
   code, where the images come from, what the current design language is, and
   what the Lighthouse/CLS/LCP picture looks like. Be specific — name files and
   line numbers. If a form posts nowhere, say so. If a "live listings" section
   renders hardcoded data, say so.
2. **PLAN.** From the audit, propose a phased rebuild — roughly one phase per
   section, plus a foundation phase for tokens/type/layout primitives and a
   final phase for performance, SEO and accessibility. Tell me what each phase
   changes and in what order. Wait for my go-ahead.
3. **BUILD, one phase at a time.** After each phase: typecheck, build, drive
   the page in a real browser (Playwright), screenshot it at 390px / 768px /
   1440px, fix what looks wrong, then commit and push that phase on its own.
   Never batch several phases into one commit.
4. Keep a running `HOMEPAGE.md` at the repo root documenting decisions, the
   token set, and the API contract, so the next session doesn't re-derive it.

## The problem with the current homepage

It looks generic — stock-template generic. Placeholder-grade imagery, flat
default spacing, type that doesn't establish a hierarchy, and sections that
read like a component library demo rather than a business explaining itself.
That is the thing to fix. I want a homepage that looks like a real,
well-funded travel brand: considered typography, real photography, deliberate
whitespace, motion that means something.

Use the `ui-ux-pro-max` skill for layout/typography/palette work, and the
`dataviz` skill if any section shows numbers. Use them as tools, not as a
substitute for judgement — the design system below is fixed and is not theirs
to reinvent.

## The design system — FIXED, copy it exactly

The portal was rebuilt on this system and the homepage must be visibly the
same product. Do not invent a palette. Do not use Tailwind's default blue/gray
ramps.

**Upload `globals.css` from the portal repo (I'll attach it) and lift the
`@theme inline` block verbatim.** It is the source of truth. The essentials:

**Colour — three families, in oklch:**

- **Marine** (the brand blue): `--color-marine-500: oklch(0.505 0.170 257)`,
  hover `600: oklch(0.435 0.148 257)`, tint `oklch(0.945 0.030 252)`,
  wash `50: oklch(0.972 0.016 252)`. Links, focus rings, selected states.
- **Ink** (a navy-black neutral doing most of the work — NOT grey):
  `900: oklch(0.225 0.036 258)` headings · `700: oklch(0.375 0.022 258)` body ·
  `600: oklch(0.470 0.018 258)` support copy · `500: oklch(0.560 0.014 258)`
  captions · `300: oklch(0.860 0.008 258)` borders ·
  `200: oklch(0.912 0.006 258)` dividers · `100: oklch(0.972 0.004 258)`.
  Deepest: `950: oklch(0.205 0.038 258)` for dark sections and shadow ink.
- **Ember** (the accent — the single spark, used sparingly):
  `600: oklch(0.565 0.172 47)` primary CTA · `700: oklch(0.505 0.155 45)` hover ·
  `500: oklch(0.720 0.170 50)` rules and the logo dot ·
  `300: oklch(0.858 0.110 58)` eyebrow text on dark.

**The contrast rule, and it is not optional:** Ember is for FILLED surfaces and
graphical accents — white text ON ember, dots, rules, rings. Never ember text
on a light background; it fails WCAG AA. Accent *text* uses marine.

**Type:** **Instrument Sans** for everything (body, labels, UI), **Poppins 500**
for display headings and the brand wordmark. Load with `next/font`. Weights
400 / 500 / 600 only — no 700, no 800.

**Shape:** buttons are full pills (999px). Containers are rectangles —
**12px** cards, **10px** controls, 50% avatars. Never mix.

**Controls:** 40px default height, 48px for hero CTAs. One focus ring
everywhere: `0 0 0 3px var(--color-marine-200)`.

**Elevation:** three shadows only.
`0 1px 2px oklch(0.205 0.038 258 / 0.04)`,
`0 4px 12px oklch(0.205 0.038 258 / 0.07)`,
`0 20px 48px oklch(0.205 0.038 258 / 0.16)`.

**Motion:** entrances are 6px / 260ms on `cubic-bezier(0.16, 1, 0.3, 1)`.
Motion explains a change; it never decorates. Everything must be neutralised
under `prefers-reduced-motion` — one global block, as the portal does it.

## Imagery — the biggest single lever

The current images are the main reason it reads as generic. I want real,
art-directed photography: airports, families, aircraft interiors, older
travellers being helped, UK/South-Asia routes. Specifically:

- Every hero and section image must be `next/image` with explicit
  `width`/`height` or `fill` + `sizes`, `priority` on the LCP image only.
- Serve AVIF/WebP. No image over ~200KB after optimisation.
- **Never** let a layout shift when an image loads — reserve the box.
- Faces and real moments over abstract stock gradients. If you use a stock
  source, pick consistently: one photographer's palette across the page, not
  eight different colour temperaments.
- Dark sections should use an ink-950 overlay over the photo so text hits AA.

## The API contract — REAL endpoints, do not invent any

Base URL: `https://wicket-travel-portal.vercel.app`

CORS on the portal already allows exactly these origins:
`https://wicket-travel.vercel.app`, `http://localhost:3000`,
`http://localhost:3100`. If you deploy the homepage anywhere else, tell me —
I have to add the origin on the portal side.

### 1. Parents Tickets lead form — `POST /api/parent-ticket`

`Content-Type: application/json`. Two sides of one board; `enquiry_type`
decides which fields apply.

Shared, all required except where noted:
`enquiry_type` (`"traveller"` | `"requester"`), `full_name`, `email`, `phone`,
`from_location`, `to_location`, `travel_date` (`YYYY-MM-DD`, optional),
`airline` (optional), `languages` (free text, optional), `notes` (optional),
`consent_public` (boolean — "you may show my masked entry on the site").

Traveller only: `assistance_offered` (text), `parents_can_help` (int 0–20),
`fee_amount` (number 0–100).

Requester only: `parent_name`, `parent_age` (0–120), `relationship`,
`assistance_needed` (text), `mobility_needs` (text), `offer_amount` (0–100).

Responses: `201 {ok:true, reference:"#PT-1042"}` ·
`422 {ok:false, error:"Validation failed.", fields:{…}}` ·
`429 {ok:false, error:"rate_limited", message, retryAfterSeconds}` (also sends
`Retry-After`). **Show the reference number back to the user on success** —
it's how support finds their enquiry.

### 2. Public listings board — `GET /api/parent-ticket/public`

Query: `type=traveller|requester`, `airport=<substring of from_location>`,
`date=YYYY-MM-DD`, `limit=1..50` (default 20).

Returns `{ok:true, count, entries:[…]}` where each entry has ONLY:
`reference`, `enquiry_type`, `display_name` (already masked to "Rajesh K."),
`from_location`, `to_location`, `travel_date`, `airline`, `languages`,
`assistance_offered`, `assistance_needed`.

There are **no contact details in this response and there never will be** —
don't build UI that expects an email or phone. Entries appear only when the
submitter opted in AND an admin approved them, so an empty board is normal and
needs a real empty state, not a spinner forever. Cached 60s at the edge.

### 3. Dubai visa enquiry — `POST /api/visa-enquiry`

Accepts `application/json`, or `multipart/form-data` with a `payload` field
holding the JSON string plus file parts for documents. Fields include
`first_name`, `last_name`, `email`, `phone`, `visa_type`,
`preferred_contact_method`. Same 201/422/429 shape, reference `#VQ-1042`.

### Rate limiting — this affects how you submit

Both write endpoints rate-limit on the **real client IP**. If you post from a
server-side route handler (recommended, so you don't expose anything), the
portal sees *your server's* IP and would throttle all your visitors together.
To pass the visitor's IP through, your relay must send:

```
x-wicket-relay-secret: <VISA_RELAY_SECRET>
x-wicket-client-ip:    <the visitor's IP as you saw it>
```

`VISA_RELAY_SECRET` must match the portal's env var — ask me for it, it is not
in this repo. Without the secret the portal ignores the forwarded IP and
buckets you by connecting IP. Limits are 8 per 15 min and 25 per 24 h per IP,
counted only on *accepted* submissions.

## Links into the portal — use these exact URLs

| Purpose | URL |
|---|---|
| Sign in | `https://wicket-travel-portal.vercel.app/login` |
| Customer sign-up | `https://wicket-travel-portal.vercel.app/signup` |
| **Become a helper** (advertise this one) | `https://wicket-travel-portal.vercel.app/join-as-helper` |
| Helper sign-up form directly | `https://wicket-travel-portal.vercel.app/signup?as=helper` |
| Book a flight (public wizard, no account needed to start) | `https://wicket-travel-portal.vercel.app/customer/book` |

`/customer/book` is genuinely public — a visitor can fill the whole booking
wizard and only makes an account at the last step. That makes it a legitimate
primary CTA from the hero, not just a "sign up" link.

## What the business actually does — get the story right

Three lines of business, and the homepage should make all three findable:

1. **Flight booking** — the core business. UK-based reseller. Customers place
   an order and a real person works it through to ticketed.
2. **Parents Tickets** — the one worth leading on emotionally. An elderly
   parent flying alone is paired with a checked traveller already on that
   route, who keeps an eye on them through the airport and on board. Every
   person is identity-verified by hand. Wicket brokers the introduction and
   takes a commission. Two audiences: **families who need help**, and
   **helpers who provide it**. Both need their own path from this page.
3. **Dubai visa assistance** — an enquiry form, handled by staff.

Tone: warm and plain-spoken, not corporate. This is a service people use when
they're anxious about a parent travelling. No jargon, no "seamless solutions".

## Non-negotiables

- **Accessibility:** AA contrast everywhere, real focus states, semantic
  landmarks, alt text that says something. Test with keyboard only.
- **Performance:** LCP under 2.5s on a throttled 4G profile, CLS under 0.1.
  No render-blocking third-party scripts.
- **SEO:** proper `<title>`/meta per section-page, Open Graph images,
  JSON-LD for the organisation and the services.
- **No fake content.** If a section can't be wired to real data yet, either
  wire it or don't build it. No fabricated testimonials, no invented
  statistics, no "trusted by 10,000 travellers" unless I give you the number.
- **Mobile first.** Most of this audience is on a phone.

## Deliverable

A homepage I'd be happy to put in a paid ad, wired to the three real
endpoints above, matching the portal's design system closely enough that
clicking through to `/login` feels like the same product.

Start with the audit. Don't write any component code until I've approved the
plan.
