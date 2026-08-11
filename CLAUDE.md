# Wicket Travel Portal — Claude Code Context

## What this is
A custom "Shared Team Inbox + Orders CRM + Admin panel" for a UK-based flight-ticket reselling business. All three roles — admin, employee and customer — log in to web portals and message each other in real time. Messaging runs entirely on **internal Supabase Realtime** between the logged-in roles (no WhatsApp, no external API, no mock layer).

## Stack (locked)
- Next.js (App Router) + TypeScript
- Tailwind CSS (+ shadcn/ui for components)
- Supabase (Postgres + Auth + Realtime + Storage) — already configured
- TanStack Query for data fetching
- Hosting: Vercel. Repo: GitHub.
- NOTE: project does NOT use a src/ directory. `app/` and `lib/` are at the root. The `@/*` import alias points to the project root.

## Already done
- Next.js scaffolded, pushed to GitHub, auto-deployed on Vercel from `main`.
  Live: **https://wicket-travel-portal.vercel.app**. (The `wicket-fawn.vercel.app`
  previously noted here is not this project and 404s.) The per-deployment URLs
  from the GitHub deployment status are SSO-protected — use the alias above to
  check a release.
- Supabase project created (London region). Keys in .env.local.
- Supabase clients exist: lib/supabase/client.ts (browser), lib/supabase/server.ts (server), lib/supabase/middleware.ts + root middleware.ts (session + route protection for /admin and /employee).
- DB schema live with 6 tables: profiles, customers, conversations, assignments, messages, orders. A trigger auto-creates a profile row on signup. RLS is ON; only a basic "own profile read" policy exists so far — fuller role policies come later.
- Auth = Email + Password. "Confirm email" is OFF.
- Migration `0022_person_fields.sql` is written but **not applied** to the live
  DB — no DDL channel from here (the Supabase MCP connector is signed in to a
  different account than the one owning this project). Until it is run,
  `profiles.phone/start_date/commission_rate` and the new `customers` columns
  silently don't persist; `createEmployee` steps its payload down 0022 → 0021 →
  base so accounts still create.

## Roles
- admin: full control (employees, access levels, all orders/chats, analytics)
- employee: only assigned conversations/orders. Sections: Orders, Messages, Dashboard, Support, Settings.
- **helper**: a Parents Tickets SERVICE PROVIDER — offers to accompany someone's
  parent on a flight they were already taking, and is paid for it. Never books
  a flight, never places an order, and gets NO `customers` row (which is why
  `/api/signup-profile` skips it for them — a helper in the admin's Customers
  list is exactly the confusion this role ends). Portal: `/helper`, front door
  `/join-as-helper`. `APPLY_HELPER_ROLE.sql` is APPLIED (2026-08-10) and the
  whole journey is verified 30/30: sign up → verify with a photo ID → post a
  trip → approved → matched → accepted → introduced → paid.
- customer: logs in to their own portal — places/tracks orders and chats with the team in real time. Cannot message on an order once it's completed/cancelled (enforced server-side via RLS).

## Three portals
- /admin — admin panel
- /employee — employee portal (the heart: 2-pane chat inbox, create order from chat)
- /customer — customer portal: book/track flights, chat with the team in real time.
  Phone-first: below 1024px `AdminShell` renders a bottom tab bar instead of the
  rail (`mobileTabs`). `/customer/book` is publicly viewable — a signed-out
  visitor fills the wizard and makes an account at the last step.
  A customer never sees cost price, commission, internal notes, the assignment
  card or any edit/status control: those are absent from the markup, not
  hidden, and RLS is the real gate.

## Design system (Navy + Orange — matches the public homepage)
- Brand / primary = NAVY: #1E3A5F, primary-dark #152C49, primary-light #2C5282
- Action / accent = ORANGE: #F97316, accent-dark #EA580C, accent-light #FB923C
- Bg #F8FAFC, surface #FFFFFF, neutral #F1F5F9
- Chip #E8EEF5, outline #DDE7EF
- Status badges: keep semantic green/amber/red/blue (blue tone = navy family), harmonized with the theme; bg+text pairs with a 5px dot
- FONT: Plus Jakarta Sans everywhere (headings + body + labels), loaded via next/font; hierarchy comes from weights
- Design language: navy is the brand surface (sidebar, headers, headings, primary surfaces); orange is the prominent action color (primary buttons, active nav pill, key highlights, CTAs, important badges, focus rings). Both clearly present, premium modern-SaaS look.
- Contrast rule: orange is for FILLED surfaces / graphical accents (white text ON orange, dots, rings, active pills) — never for small text on a light bg (fails WCAG AA). Accent TEXT uses the navy `brand` token.
- Token source of truth: CSS variables in `app/globals.css` (`:root`) surfaced via `@theme inline`. Consume tokens (`bg-primary`, `text-navy`, `text-brand`, `bg-chip`, `bg-sidebar`, `text-orange`, etc.) — never hardcode hex.
- Rounded 14–16px cards, soft shadows, modern SaaS look
- Portal shell: ~260px navy sidebar, active nav = solid ORANGE pill, content max ~1152px

### The product interior — Claude Design "Admin Portal All Pages"
`/admin`, `/employee` **and** `/customer` all follow the Claude Design
**"Admin Portal All Pages"** file, which extends the auth design's system into
the product interior. The employee and customer portals had no design file of their own; the user
authorised building both from this one as the reference.
- Type: **Instrument Sans** everywhere, **Poppins 500** for page titles, the
  brand wordmark and headline metrics. Weights are 400 / 500 / 600 only.
  The project-wide `h1..h4 { font-family: Jakarta }` base rule is cancelled
  inside `.admin-root` (`:is(h1,…,h6)` → Instrument Sans, tracking cleared), so
  a bare `<h2>` in an admin component gets the right face without a utility.
- Page titles are **ink-700 at line-height 1.5** — the design's h1 declares
  neither, so both come from the shell. Do not darken or tighten them.
- Status labels are **sentence case** (`statusLabel()` in `lib/format.ts`):
  "In progress", never "In Progress". `titleCase()` is for other enums.
- Several design rows are `<button>`s, so their contents sit on the UA's
  `line-height: normal`, not the shell's 1.5. Where a row's height has to
  match (dashboard order rows, sidebar nav items) put `leading-[normal]` on
  the row so its children inherit it.
- Colour: the auth **Marine / Ink / Ember** namespace plus the interior tokens
  (`--color-ink-800…950`, `--color-line-*`, `--color-surface-*`,
  `--color-warn-*`, `--color-ok-*`, `--color-teal-*`, `--color-violet-*`,
  `--color-danger-*`, `--color-canvas`). All in `app/globals.css` `@theme inline`.
- Scoping: `.admin-root` on `AdminShell` carries the design's base layer
  (typeface, canvas, link colour, focus ring, 44px mobile targets, scrollbars).
  Any new admin screen must render inside `AdminShell` to inherit it.
- **One component, three portals.** The old "two skins" layer is gone —
  `PageHeader`, `SectionCard`, `StatCard`, `StatusBadge`, `UserCell` and their
  `.wt-*` CSS were deleted once the customer portal moved over. When a portal
  needs different behaviour, **generalise the component with a prop that
  defaults to the admin's behaviour** — never fork it or restyle it in place.
  `globals.css` still retunes shared shadcn controls inside `.admin-root`;
  only `button`, `skeleton` and `sonner` survive in `components/ui/`.
- Shape language: **buttons are pills (999px), containers are rectangles** —
  10px controls, 12px cards, 50% avatars. `--radius` is 0.75rem here, so
  Tailwind's `rounded-lg/xl` resolve to 12/16.8px — use `rounded-[10px]` /
  `rounded-[12px]` explicitly.
- Controls: sm 34px (filter chips, in-table actions) · md 40px (default) ·
  auth-only lg 48px. One focus ring everywhere:
  `0 0 0 3px var(--color-marine-200)`.
- Status pills are tint-fill + dark ink, no dot: New=marine, In progress=warn
  (hue 82 — its *own* hue, never Ember), Completed=success, Cancelled=ink.
  Money is ink 500/600 tabular and never coloured; commission is the only figure
  allowed a success tint.
- Tables: **54px** rows, `0 20px` cells, 40px uppercase head on
  `--color-surface-2`, horizontal scroll inside `.om-scroll`. Every list has an
  explanatory empty state (`EmptyState` in `components/admin/ui.tsx`).
- Primitives live in `components/admin/ui.tsx`; the icon set in
  `components/admin/icons.tsx`; the shell in
  `components/admin/admin-shell.tsx`; the two-pane inbox in
  `components/admin/admin-inbox.tsx`; the order-detail boarding pass in
  `components/admin/boarding-pass.tsx`.
- The **order screens** are the design's own build, shared by all three
  portals via props:
  `components/admin/order-detail.tsx` (back link → header with `#ref` + status
  pill + Edit / Message customer / Cancel / **Mark complete** → boarding pass →
  a `2.4fr / 1fr` split: Flight details tiles + the live `OrderThread` on the
  left, Passengers / Pricing / Assign Employee / Customer down the right),
  `components/admin/order-thread.tsx` (the design's Messages card — day
  dividers, 32px role-tinted avatars, `14px 14px 4px 14px` own-bubble in
  marine-500, 42px circular send) and `components/admin/admin-order-form.tsx`
  (the three-step Create-an-order wizard: step rail with Done/Current/Next
  tracks, flight-check radio cards, passenger blocks, Review rows with per-row
  edit jumps, footer error summary; `audience="customer"` drops the customer
  picker, adds a contact block and a real uploader, and routes a signed-out
  visitor through sign-up with their draft kept). Every portal writes the same
  `OrderFormInput`, so the persisted record is identical whoever booked it.
- Routes render as IATA codes in tables (`routeLabel()` in `lib/format.ts`) —
  the design's pipeline row assumes `LHR → DXB`, not the full place name, which
  is what the record itself shows.
- People screens (Employees, Customers) carry **one search box and no filter
  pills** — the design gives them no status filter. Customers is
  `Customer · Email · Phone · Orders · Status · View`.
- **Add employee / Add customer** are the design's own 780px sheet
  (`components/admin/person-dialog.tsx`), not the shared shadcn `<Dialog>`:
  marine glyph header, uppercase section headings over a
  `minmax(240px,1fr)` grid of 42px controls, surface-1 footer with the note
  and the ember CTA. Both screens pass a field model; only Employees passes
  `extra` (the access cards). The design ticks **one area per row**; RLS here
  enforces a single `access_level` tier, so the same cards are a radiogroup —
  a per-area matrix would not be honoured.
- The Messages screen opens the newest thread automatically above 940px; the
  thread badge counts customer messages **waiting on a reply** (there is no
  per-admin read receipt in the schema).
- **Icons are the design's own `ico()` table, copied path-for-path** into the
  `GLYPHS` map in `icons.tsx` (24-box, 1.7px stroke, `currentColor`, round
  caps, no icon library). Do not redraw or "tidy" a glyph — the numbers *are*
  the drawing. `Ico name=…` renders any of them; `iconForField(label)` is the
  design's own label→glyph mapping used by every detail card and form row.
- Sidebar is **256px** on the design's vertical ink ramp
  (`--color-sidebar-top` → `--color-sidebar-bottom`), groups the eleven areas
  into **Dashboard / Work / Enquiries / Peoples / Admin**, and marks the active
  item with a 10%-white fill plus a 3px **ember** inset bar (never a marine
  fill). Live unactioned counts sit on Orders, Messages, Visa queries, Parent
  tickets and Support as small warm figures. It goes off-canvas below 1024px
  behind a hamburger + scrim.
- The top bar's search is **per-screen**: it only renders on the screens in
  `SEARCH` in `admin-shell.tsx`, each with its own placeholder, and hands the
  term to that screen as `?q=`. Screens read it with `useSearchParams`.
- Notifications is reachable from the bell / account menu, not the sidebar.
  `/admin/messages/[id]` is a redirect into the one inbox (`?c=<id>`).

### Auth screens — scoped exception (Claude Design "Auth Pages")
/login, /signup, /forgot-password and /reset-password follow the Claude Design
"Auth Pages" + "Brand System" files exactly, which use a different palette and
type pairing from the portal interior. Both live side by side:
- Type: **Instrument Sans** (body/labels/inputs) + **Poppins** (display headings,
  brand wordmark), loaded in `app/layout.tsx` as `--font-instrument-sans` /
  `--font-poppins-sans`. The portals stay on Plus Jakarta Sans.
- Colour: **Marine** (links, focus, caret), **Ink** (a navy-black neutral ramp
  doing most of the work) and **Ember** (the CTA / single spark). Exact oklch
  values live in `app/globals.css` under `--color-marine-*`, `--color-ink-*`,
  `--color-ember-*`, plus `--color-alert-*`, `--color-pass-*`, `--color-hero-*`.
  These are a **separate namespace** from the navy/orange tokens — nothing above
  changed, so the admin/employee/customer shells are untouched.
- Scoping: the `.auth-root` class on `AuthShell` carries the design's own base
  layer (typeface, link colour, placeholder, focus outline, 44px mobile touch
  targets). Any new auth screen must render inside `AuthShell` to inherit it.
- Breakpoints follow the design, not Tailwind's defaults: the two panes stack
  below **900px** and the hero subcopy drops below **460px**.
- Password policy is the design's live checklist: 10+ chars, a capital, a
  number, a symbol (`lib/security/password.ts`).
- The hero carries the design's **screen switcher** (Sign in / Sign up / Reset /
  Sent / New password). These are real links; "Sent" is `/forgot-password?sent=1`,
  which is why that route is a server shell + `forgot-password-form.tsx` client
  component rather than one client page.
- `HERO_IMAGE` in `auth-shell.tsx` maps a photo per screen. Only
  `public/auth/hero-flight.jpg` ships — the design's other four assets exceed the
  192 KiB the design tool will return. Drop `hero-signup.jpg`, `hero-forgot.png`,
  `hero-sent.jpg`, `hero-reset.jpg` into `public/auth/` and they take over with
  no code change; until then `onError` falls back to the sign-in photo.

## Messaging (internal realtime)
- All messaging is internal: admin ⇄ employee ⇄ customer, over Supabase Realtime between logged-in roles. No WhatsApp, no external messaging API, no mock/simulate layer.
- Sender role is labelled in the UI as **Admin**, **Support Team** (employee), or **Customer**.
- Orders carry a human order number (e.g. `#7343490`) and a lifecycle status: `new → in_progress → completed / cancelled`. Customers cannot send messages on a completed/cancelled order — enforced server-side via RLS, not just the UI.
- Realtime is enabled (publication `supabase_realtime`) on conversations, messages, orders, order_messages and order_attachments. RLS scopes every stream: admin sees everything, employee sees only assigned orders/conversations, customer sees only their own.

## Parents Tickets
A second product line inside the same portal: matching a traveller who can
assist an elderly parent en route with someone who needs that help.

**There is no public marketing site in this repo.** `app/page.tsx` is a
redirect to `/login`. The homepage that carries the lead form and the masked
listings board is a SEPARATE deployment **on a separate Vercel account**, live
at `https://www.wickettravel.com` (the apex 308s to `www`, and
`https://wicket-travel.vercel.app` still serves it too); this repo only owns the
API it calls and the admin screens. So "check the homepage form" can never be
answered from here — only the endpoint can. `HOMEPAGE_BRIEF.md` at the root is
the handover document for that repo.
- The browser-facing allowlist is **`lib/security/cors.ts`, one list for all
  three public endpoints** — it used to be copy-pasted into each route, so
  adding a domain was three edits and missing one failed silently in browsers
  only. `HOMEPAGE_ORIGINS` (comma-separated) extends it from the Vercel
  dashboard without a deploy, which matters because the homepage's preview URLs
  come from an account this project cannot see.
- CORS is not the security boundary. Every public endpoint validates
  server-side and rate-limits by real client IP regardless of origin, because
  curl sends no preflight.

**Basic scope — LIVE.** `parent_ticket_enquiries`, refs `#PT-1001`.
`POST /api/parent-ticket` (service-role write after validation, CORS-pinned,
per-real-IP rate limit through the relay-secret header) and
`GET /api/parent-ticket/public` (an explicit column allowlist, names masked by
`maskDisplayName`, gated on `is_public AND consent_public`). Admin screens are
`/admin/parents-tickets` + `[id]`, already on the product design system.
SQL: `APPLY_PARENTS_TICKETS.sql`, `APPLY_PARENTS_PUBLIC.sql`.

**Full scope (marketplace) — chunk 0 APPLIED 2026-08-09.**
`APPLY_PARENTS_FULLSCOPE_0.sql` at the repo root added four tables
(`parent_ticket_identities`, `parent_ticket_listings`, `parent_ticket_matches`,
`parent_ticket_payments`), the private `parent-ticket-ids` bucket and the
contact-release rule. Additive — it does not touch `parent_ticket_enquiries`.
`lib/parents-marketplace.ts` mirrors it in TypeScript (types, labels, and the
pure `scoreMatch` ranking).

**Chunk 1 — identity verification, DONE 2026-08-09.**
`/customer/parents/verify` ("Get verified") is the traveller's side: a
three-step checklist, details form and a private ID upload.
`/admin/parents-verification` + `[id]` is the review queue, with a live count
on the sidebar. Actions live in `lib/actions/parents-marketplace.ts`.
- `email_verified` is a **cache of `auth.users.email_confirmed_at`**, not a
  second verification system. Confirmation is ON for this project, so Auth is
  the one source of truth; `refreshEmailVerified()` syncs it (the write needs
  the service role because the column is admin-only by design).
- The ID document is **never rendered back** — not even to its owner. It is
  uploaded straight to the private bucket under `<uid>/…` (the storage policy
  pins that first segment to `auth.uid()`), and only a reviewing admin sees it
  via a one-hour signed URL minted on click. Nothing holds a document URL at
  rest.

**Chunk 2 — listings, the dashboard and the approval workflow, DONE
2026-08-09.** `/customer/parents` is now the dashboard (item 3), with
`new`, `[id]` and `[id]/edit` under it; `/admin/parents-listings` + `[id]` is
the review queue. Actions live in `lib/actions/parents-listings.ts`.
- **One form, both kinds.** `listing-form.tsx` writes a traveller listing or a
  parent request from the same sectioned page — the two sides share route,
  date, languages and fee, and only the middle section differs. Switching kind
  blanks the other side rather than leaving stale values on a record that no
  longer shows them.
- Assistance types and languages are **controlled lists** (`ASSISTANCE_KINDS`,
  `LANGUAGES`), not free text, because `scoreMatch` intersects the two arrays
  directly — freehand "Punjabi"/"panjabi" would never meet.
- A listing can be **drafted** unverified but not **sent**: the gate is in
  `submitListing()`, not the database. Every listing is reviewed by a human who
  can see the poster's verification state, so an unverified record reaching the
  queue is untidy rather than unsafe. Revisit if listings ever auto-approve.
- `parent_ticket_listings` and `parent_ticket_identities` both hang off
  `profiles` but have **no FK between them**, so PostgREST cannot embed one in
  the other ("Could not find a relationship"). `withIdentities()` stitches the
  verification status on in a second query.

**Chunk 3 — search, ranking and matches, DONE 2026-08-09.**
`/admin/parents-matches` + `[id]` is the queue; ranked candidates appear on an
approved listing's review screen; the customer sees and answers their matches
on `/customer/parents`. Actions live in `lib/actions/parents-matches.ts`.
- **Matching is admin-driven by design.** The database refuses a party-created
  match outright, because an introduction here is a brokered service someone is
  paid for. A customer can only accept or decline.
- **A score ranks, it never authorises.** `scoreMatch` runs in TypeScript, not
  SQL, because it weighs five signals and has to explain itself in words; the
  pool is narrowed in the DB first (opposite kind, approved, ±14 days). The
  score on a match is recomputed server-side, never taken from the client.
- The match screens fetch the owner's **name only** — no email. An admin is
  entitled to it and it is one click away on the listing, but a column selected
  here rides along in the RSC payload whether or not it is rendered, so it is
  not fetched at all. The customer's own match view shows the counterparty with
  no name either: flight, help and fee are enough to decide on.
- Contact release lands in chunk 4. Accepting does not release anything.

**Chunk 4 — contact release and manual payments, DONE 2026-08-09.**
The payment and the introduction sit on **one card** on the match record,
because they are one decision; `/admin/parents-payments` is the ledger.
Actions live in `lib/actions/parents-payments.ts`.
- **Release is irreversible and there is no un-release action anywhere.** The
  card says so before the click, not after.
- The gate — both accepted AND a payment marked paid — is stated once in
  `canReleaseContact()`, read by both the button's disabled state and the
  server action, so they cannot drift apart.
- `payout_amount` is **derived, never typed** (gross − commission); commission
  above gross is rejected rather than clamped, because that is a typo and a
  silent zero would hide it. Payer and payee come from the match, not the form.
- After release, contact details come **only** from the
  `parent_ticket_match_contact` RPC. `profiles` stays unreadable across users
  before and after — the flag is the gate, not an accident of RLS.

Three rules that layer carries, worth knowing before extending it:
- **RLS says which rows, a BEFORE-trigger says which columns.** An owner can
  edit their own listing but silently cannot approve or publish it — the guard
  restores the old value rather than raising, so a hostile client gets a no-op.
- **`is_privileged_writer()` and every `tg_guard_*` are SECURITY INVOKER, and
  that is load-bearing.** Inside a SECURITY DEFINER function `current_user` is
  the *owner*, so a DEFINER version reads `postgres` and returns true for
  everyone, disabling every guard. Only `is_admin()` is DEFINER, because it
  alone must read past `profiles`' RLS.
- **Contact details have exactly one route:** the
  `parent_ticket_match_contact(match_id)` RPC, which returns nothing unless the
  match is released AND the caller is a party. There is no policy, view or
  column that exposes a counterparty's email or phone.

Payments are Stage A only — an admin records money that moved outside the
system. No provider integration.

**The lead → listing bridge — DONE 2026-08-10, SQL APPLIED.** Verified 32/32
end to end: the card finds the matching account, creates a draft the person
owns, maps free-text languages onto the controlled list, and pointedly does
not guess the assistance boxes.
`APPLY_PARENTS_LEAD_BRIDGE.sql` adds `converted_listing_id` and `invited_at`
to `parent_ticket_enquiries`. It exists because the two funnels never touched:
the homepage form dropped a lead into a queue an admin phoned, and the
marketplace waited for people who already knew the URL.
- The admin lead detail gains a **"Bring into the marketplace"** card
  (`components/admin/lead-bridge.tsx`), and `/signup?email=&name=` prefills
  from an invite link.
- **It cannot create an account.** A listing hangs off a verified profile, so a
  lead becomes a listing only once its author holds one — otherwise the admin
  sends a sign-up link and the lead waits.
- **The assistance checkboxes are never guessed.** A lead's free text can't be
  mapped onto `ASSISTANCE_KINDS` without inventing intent, and `scoreMatch`
  intersects those arrays directly. It is carried into the notes instead.
- The bridge **fails soft**: `getLeadBridgeState` is caught in the page, so the
  card simply doesn't render if the columns are missing.

**Helper role + portal — code DONE 2026-08-10, `APPLY_HELPER_ROLE.sql` NOT YET
APPLIED.** A customer BUYS (flights, help for a parent); a helper PROVIDES.
- `/helper` renders the same `AdminShell` as every other portal, and its pages
  reuse `ListingsView`, `ListingForm`, `ListingDetail` and `VerificationView`
  via `basePath` / `audience` / `lockKind` props — per the one-component rule,
  generalised rather than forked.
- **`lockKind` removes the "which side are you on?" chooser in both portals.**
  Being in `/helper` means traveller; being in `/customer/parents` means
  requester. The question is answered by the door you came in.
- Helper support is an honest contact card, NOT the customer ticket form:
  `support_tickets` is gated to `role = 'customer'` in RLS as well as in the
  action, so that form would fail every time. Opening it to helpers needs a
  policy change on a table that works today — a separate small job.
- `UserRole` was declared in BOTH `lib/auth.ts` and `lib/db/types.ts` and had
  drifted; `lib/auth.ts` now re-exports the one in `db/types.ts`.
- **One person is one role.** Somebody who both helps and needs help would need
  two accounts. If that turns out to bite, the fix is a capability flag, not a
  second role.

## Build order
1. Auth + login + role-based redirect — DONE
2. Employee portal: chat inbox UI + internal realtime send — DONE
3. Orders + Dashboard — DONE
4. Admin panel: employees, access levels, analytics — DONE
5. Customer portal: orders + realtime chat — DONE
6. Foundation: orders/order-messages/attachments schema, realtime + RLS — DONE
7. Admin portal on the Claude Design, all 18 screens — DONE (2026-08-08)
8. Employee portal moved onto that design system, 6 phases — DONE (2026-08-08)
9. Customer portal moved onto it, 7 phases + the two-skin retirement — DONE (2026-08-08)
10. Parents Tickets marketplace, chunk 0 (schema) — APPLIED 2026-08-09
11. Parents Tickets marketplace, chunk 1 (identity verification, both sides) —
    DONE 2026-08-09
12. Parents Tickets marketplace, chunk 2 (listing + request forms, the customer
    dashboard, the admin approval workflow) — DONE 2026-08-09
13. Parents Tickets marketplace, chunk 3 (search, ranking, matches and party
    responses) — DONE 2026-08-09
14. Parents Tickets marketplace, chunk 4 (contact release + Stage A manual
    payments) — DONE 2026-08-09. **The full-scope loop is now closed**: items
    1-8 are all built. What remains is item 9 (polish, security review,
    testing) and the reports half of item 8.


## Production readiness (audited 2026-08-10)

A page-by-page functional audit drove all three portals as each role — 41
screens, every one HTTP 200. It found exactly one functional bug; the rest of
the work was polish, security and scale.

- **`roleDashboardPath()` lives in `lib/db/types.ts`, not `lib/auth.ts`**, and
  is the ONLY role → portal map. The login form is a client component and
  cannot import `lib/auth` (it pulls `next/headers`), so it used to carry a
  hardcoded ladder that fell through to `/customer` — which sent every helper
  to the wrong portal. `lib/auth` re-exports it for server callers.
- **`lib/supabase/client.ts` is a per-tab SINGLETON, and that is load-bearing.**
  It used to return a fresh client per call, and each client opens its OWN
  Realtime WebSocket — the always-mounted bell plus a per-screen channel meant
  2–3 sockets per session. At 100 concurrent users that is 200–300 connections
  against a ceiling of 200. Never go back to constructing one per component.
- **A page that only redirects must do it in `next.config.ts`, not with a
  server `redirect()`.** `/admin/messages/:id` redirecting into the SAME layout
  tree threw "Rendered more hooks than during the previous render" from Next's
  own Router. Routing-layer redirects never reach React.
- Motion lives in `globals.css` (`wt-enter`, `wt-route`, `wt-row`) and is
  neutralised wholesale by the existing `prefers-reduced-motion` block. Each
  portal has a `template.tsx` (page entrance — a layout would fire once) and an
  `error.tsx` (so a crash keeps the shell instead of falling to the root
  boundary). `components/admin/nav-progress.tsx` uses `useLinkStatus` to answer
  "did my click land?" on the item actually clicked.
- The toast is the product's own (`components/ui/sonner.tsx` +
  `toast-icons.tsx`), not sonner's default: Instrument Sans, 12px radius, our
  shadow, the design's glyphs, offset clear of the 64px top bar.
- **All 114 server actions authenticate** — verified by sweeping every
  `export async function` in `lib/actions/`. `auth-guard` and `signOut` are
  pre-auth by design.
- Rate limiting uses `tooManyRecentRows()` from `lib/security/rate-limit.ts`
  (fail-open). Covered: login/signup, messages, orders, listings, support
  tickets. Add it to any new public-reachable write.
- A replaced ID document is **deleted** from storage — an ID somebody already
  superseded sitting there indefinitely is a retention problem, not a backup.

**Round two (2026-08-10) — notifications, loading and the helper front door.**
- **The marketplace had no notifications at all.** Listings, verifications,
  matches and introductions all changed state silently, so the only way to find
  out was to keep reopening the portal. `lib/notify.ts` now fires from the
  server actions rather than a trigger: the action already knows who to tell
  and what to say, where a trigger would re-derive both from a row diff and
  need a migration per message. Delivery is best-effort — a failed
  notification must never roll back the approval it was announcing.
- `notifications.type` is **free text in the database**, so `listing_review`,
  `match` and `contact_released` needed no SQL. The TS union and the two UI
  maps (bell + notifications page) are the only places that constrain it.
- **48 `loading.tsx` files**, one per route shape rather than one per portal.
  `components/admin/skeletons.tsx` holds four: list, detail, inbox, form. A
  single generic skeleton is worse than none — it shows a KPI grid on a screen
  with no KPIs and the layout jumps when real content lands.
- `/join-as-helper` is the helper's own front door, with its own hero copy
  (`AuthScreen` gained a `helper` variant). `/signup?as=helper` still works and
  is what the page hands off to — a query string is not something you can put
  on a poster.
- A listing owner can now turn public display on or off **at any point**
  (`setMyListingConsent`). It used to be editable only while a draft, which
  left someone who changed their mind with no way to say so.

Known and accepted at this scale: `listCustomersWithStats` reads every order
and conversation row to count them (2 columns, fine into the thousands; revisit
past ~50k). Detail routes share their portal's `loading.tsx` rather than each
having a bespoke skeleton.

**Matched parties talk in the portal — DONE 2026-08-10, SQL APPLIED.**
Verified 20/20 as three people signed in at once: sealed before release
(refused by the database, not just the UI), a real two-way conversation
after, arriving over realtime on an already-open page, an admin reading it
and stepping in, a stranger blocked from reading and writing, a forged sender
rewritten, and history that cannot be edited or deleted. One thread per match
(`parent_ticket_messages`), rendered by `components/parents/match-thread.tsx`
in all three portals.
- **The thread opens at RELEASE, not at acceptance.** Opening it on mutual
  acceptance would be friendlier and would also let two people arrange the
  whole trip and swap details without the payment release depends on — which
  is the business model, not a technicality. The gate is the INSERT policy, so
  it holds for a hostile client exactly as for the UI.
- **Nobody can edit or delete a message — not even an admin.** There is no
  UPDATE or DELETE policy at all. A thread that settles "what did we agree" is
  worth nothing if it can be rewritten afterwards.
- An admin reads every thread and can post in one, and sees both real names;
  a party sees "You" and the counterparty. The guard trigger overwrites
  `sender_id` with `auth.uid()`, so a forged sender becomes the caller's own.
- `listMatchMessages` returns `[]` on PGRST205 so the portal renders before
  the SQL is applied.
- **A party cannot read an admin's `profiles` row**, so the embedded `sender`
  is null for anything staff wrote and the bubble credited it to the other
  family. `MatchThread` takes `partyIds` and decides staff by elimination —
  anyone who isn't one of the two people in the match is our team. Do not
  "simplify" that back to reading `sender.role`.

**The driver portal was REMOVED 2026-08-10** at the client's request — it was
mock-only, had no auth, was half-migrated, and its ₹/India content never
matched this UK business. `app/(driver)`, `app/(driver-auth)`,
`components/driver`, `lib/driver` and thirteen orphaned `components/ui/*`
files went with it. Recoverable from git history if it is ever wanted back.

## Rules
- One feature at a time. Keep code clean and typed.
- Use the locked palette + fonts everywhere.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
