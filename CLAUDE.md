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
the product interior. Only the **driver** portal is still on navy/orange.
The employee and customer portals had no design file of their own; the user
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
  `globals.css` still retunes shared shadcn controls (`[data-slot="button"]`,
  `input`, `textarea`, `table`, `card`) inside `.admin-root`, which now only
  matters for the driver portal's copies.
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
listings board is a SEPARATE deployment (`https://wicket-travel.vercel.app`);
this repo only owns the API it calls and the admin screens. So "check the
homepage form" can never be answered from here — only the endpoint can.

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

**Chunk 1 — identity verification, DONE 2026-08-09.** `/customer/parents`
("Get verified") is the traveller's side: a three-step checklist, details form
and a private ID upload. `/admin/parents-verification` + `[id]` is the review
queue, with a live count on the sidebar. Actions live in
`lib/actions/parents-marketplace.ts`.
- `email_verified` is a **cache of `auth.users.email_confirmed_at`**, not a
  second verification system. Confirmation is ON for this project, so Auth is
  the one source of truth; `refreshEmailVerified()` syncs it (the write needs
  the service role because the column is admin-only by design).
- The ID document is **never rendered back** — not even to its owner. It is
  uploaded straight to the private bucket under `<uid>/…` (the storage policy
  pins that first segment to `auth.uid()`), and only a reviewing admin sees it
  via a one-hour signed URL minted on click. Nothing holds a document URL at
  rest.

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
    DONE 2026-08-09. Next: the full listing / request forms (item 2) and the
    customer's listings dashboard (item 3), then search + matching (item 4).

The **driver** portal migration is PART DONE and paused (2026-08-09). On the
design system: the shell, Home, Job board, My rides, Earnings and their
components. Still on navy/orange and still importing `components/ui/` + lucide:
`messages`, `profile`, `rides/[id]`, and the two auth screens under
`app/(driver-auth)/`. `DriverShell` wraps `AdminShell` in `<Suspense>` — the
driver group has no auth layout, so its pages prerender and `useSearchParams`
needs the bail-out boundary. Driver mock data is ₹ / India-based while the rest
of the business is UK / £; that is a content decision still open.

## Rules
- One feature at a time. Keep code clean and typed.
- Use the locked palette + fonts everywhere.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
