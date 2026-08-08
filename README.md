# Wicket Travel Portal

A custom **Shared Team Inbox + Orders CRM + Admin panel** for a UK flight-ticket
reselling business. Admin, employees and customers each sign in to their own
portal and message one another in real time.

**Live:** https://wicket-travel-portal.vercel.app

---

## Contents

- [What it is](#what-it-is)
- [Stack](#stack)
- [Running it locally](#running-it-locally)
- [Portals and routes](#portals-and-routes)
- [Roles and permissions](#roles-and-permissions)
- [Data model](#data-model)
- [Messaging](#messaging)
- [Design system](#design-system)
- [Project layout](#project-layout)
- [Migrations](#migrations)
- [Conventions](#conventions)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)

---

## What it is

The business sells flight tickets. An enquiry arrives (from the website, or as
a message), an employee turns it into an **order**, quotes it in a thread the
customer can read, and closes it when the tickets are issued. Everything —
the enquiry queues, the order pipeline, the conversation, the commission — is
in one place.

Three things make it more than a CRM:

1. **Messaging is first-class and internal.** No WhatsApp, no external API. All
   three roles talk over Supabase Realtime, and every order carries its own
   thread alongside the general conversation inbox.
2. **The customer sees the same record you do.** They sign in, watch the order
   move through `new → in_progress → completed`, and reply in the thread.
3. **Row-level security is the permission model**, not the UI. An employee who
   is not assigned to a conversation cannot read it, whatever the client asks
   for.

---

## Stack

| Layer      | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React Server Components)          |
| Language   | TypeScript                                                |
| Styling    | Tailwind CSS v4 (`@theme inline` tokens) + a few shadcn/ui primitives |
| Data       | Supabase — Postgres, Auth, Realtime, Storage              |
| Fetching   | TanStack Query on the client; server actions for writes   |
| Hosting    | Vercel (auto-deploy from `main`)                          |

There is **no `src/` directory** — `app/`, `components/` and `lib/` sit at the
root, and the `@/*` import alias points at the project root.

---

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the three keys below
npm run dev                        # http://localhost:3000
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…        # server-only, never import into a client component
```

Other scripts:

```bash
npm run build     # production build (also the fastest full type-check)
npm run start     # serve the production build
npx tsc --noEmit  # types only
npx eslint .      # lint
```

**Applying migrations.** There is no migration runner wired up. Paste the SQL
from `supabase/migrations/` into the Supabase SQL editor in filename order.
Everything from `0021` onward is written to be *additive and optional*: the app
detects a missing column (PostgREST `PGRST204`) and retries with a smaller
payload, so a deploy is safe whether or not the SQL has been applied yet.

---

## Portals and routes

| Portal       | Route prefix | Who                                            |
| ------------ | ------------ | ---------------------------------------------- |
| **Auth**     | `/login`, `/signup`, `/forgot-password`, `/reset-password` | everyone |
| **Admin**    | `/admin`     | full control: orders, people, enquiries, analytics, settings |
| **Employee** | `/employee`  | only what they are assigned                    |
| **Customer** | `/customer`  | their own bookings, quotes and threads          |
| **Driver**   | `/driver`    | a separate ground-transport surface            |

### Customer screens

`/customer` (Dashboard) · `book` · `orders` · `orders/[id]` · `messages` ·
`support` · `profile` · `notifications`

`/customer/book` is the one publicly viewable route — a signed-out visitor
fills the whole wizard and makes an account at the last step.

### Admin screens

`/admin` (Today) · `orders` · `orders/new` · `orders/[id]` · `messages` ·
`analytics` · `transactions` · `visa-queries` (+ `[id]`) · `parents-tickets`
(+ `[id]`) · `employees` (+ `[id]`) · `customers` (+ `[id]`) · `support` ·
`settings` · `notifications`

The sidebar groups these into **Dashboard / Work / Enquiries / Peoples /
Admin**. Notifications is reached from the bell, not the sidebar.

---

## Roles and permissions

`profiles.role` is one of `admin | employee | customer`. Employees additionally
carry `profiles.access_level`:

| Level        | Can                                                        |
| ------------ | ---------------------------------------------------------- |
| `full`       | everything — chats, orders and settings                    |
| `semi_admin` | full access plus order editing and status management       |
| `chat_only`  | conversations only, no orders                              |
| `view_only`  | read chats and orders, cannot reply or edit                |

This is a **single tier per employee**, not a per-area matrix — RLS reads
`access_level`, so anything the UI offers has to map onto one of these four.

Route protection lives in `middleware.ts` + `lib/supabase/middleware.ts`;
the real enforcement is RLS in Postgres.

---

## Data model

Core tables (see `lib/db/types.ts` for the TypeScript mirror):

- **profiles** — one row per auth user. Role, access level, job title, phone,
  start date, commission band, active flag.
- **customers** — the customer record. Links to a `profile_id` once they have a
  portal login; also holds passport-shaped detail (preferred name, nationality,
  date of birth, address), an internal note and an assigned consultant.
- **conversations** / **messages** / **assignments** — the general inbox.
- **orders** — the heart. Route, dates, passengers, cabin, airline, flight
  numbers, pricing (`cost_price`, `selling_price`, `commission`), payment,
  status, creator and assignee. A trigger generates the human `order_number`
  (`#7343490`).
- **order_messages** / **order_attachments** — the per-order thread.
- **notifications** / **notification_prefs** — in-app alerts and who wants what.
- **business_settings** — trading name, company number, ATOL, IATA, support
  contacts, default commission, currency, logo.
- Visa enquiries, parent tickets and support tickets each have their own table.

**Realtime** is enabled on `conversations`, `messages`, `orders`,
`order_messages` and `order_attachments`. RLS scopes every stream: admin sees
everything, an employee sees only what they are assigned, a customer sees only
their own.

---

## Messaging

- Entirely internal, over Supabase Realtime between signed-in roles.
- Two surfaces: the **conversation inbox** (`/admin/messages`,
  `/employee/messages`, `/customer/messages`) and the **order thread** on every
  order.
- A customer **cannot** message on a `completed` or `cancelled` order. That is
  enforced in RLS, not just hidden in the UI.
- Sender labels differ by portal on purpose: the shared portals say
  *Admin / Support Team / Customer* (`lib/chat/labels.ts`), while the admin
  design's own threads say *Admin / Support / User*.

---

## Design system

**Admin, employee and customer are one design system.** All three render
inside `AdminShell`, which carries `.admin-root` — the scope that supplies the
typeface, canvas, focus ring and control sizing. `/admin` follows the Claude
Design **"Admin Portal All Pages"** file to the pixel; the employee and
customer portals were built from that same system, since neither had a design
file of its own.

| Scope        | Class         | Type                      | Colour               |
| ------------ | ------------- | ------------------------- | -------------------- |
| **Product**  | `.admin-root` | Instrument Sans + Poppins | Marine / Ink / Ember |
| **Auth**     | `.auth-root`  | Instrument Sans + Poppins | Marine / Ink / Ember |
| Driver       | *(default)*   | Plus Jakarta Sans         | Navy + Orange        |

The driver portal is the only surface still on the original navy/orange
system. `.ds-root` is an alias for `.admin-root` in every scoped rule.

Full spec — tokens, type scale, control sizes, table rules, the icon system and
every component — is in **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**.

---

## Project layout

```
app/
  (admin)/admin/…      admin screens
  (employee)/employee/… employee portal
  (customer)/customer/… customer portal
  (driver)/driver/…    driver portal
  (auth)/…             login / signup / password reset
  globals.css          every design token + both skins
components/
  admin/               the design system — shared by all three portals
  employee/ customer/  the screens each portal does not share
  driver/              the driver portal (still navy/orange)
  ui/                  shadcn primitives (driver portal only)
lib/
  actions/             server actions ("use server") — every write
  db/                  typed reads
  supabase/            browser / server / middleware clients
  format.ts            money, dates, routes, status labels
  access.ts            access-level labels and helpers
supabase/migrations/   SQL, applied by hand in filename order
```

---

## Migrations

`0002` … `0022`. The most load-bearing:

| File   | What it does                                                     |
| ------ | ---------------------------------------------------------------- |
| `0002` | the original RLS policy set                                      |
| `0009` | notifications + per-user preferences                             |
| `0014` | private attachment storage                                       |
| `0016` | order inbox, attachments, realtime publication                   |
| `0017` | security hardening                                               |
| `0021` | the fields the admin design displays (airline, flight numbers, budget, payment, job title, trading identifiers) |
| `0022` | the person fields the Add-employee / Add-customer forms collect  |

Some tables (visa enquiries, parent tickets) were applied from root-level
`APPLY_*.sql` files rather than a numbered migration — don't delete those.

---

## Conventions

- **One feature at a time.** Keep code clean and typed.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.** Service-role
  writes live in `lib/actions/*` behind an explicit `requireAdmin()` check,
  because service role bypasses RLS.
- **Server actions are endpoints.** An exported action with no caller is still
  reachable — delete it rather than leaving it.
- Consume design tokens, never hard-coded hex. See DESIGN_SYSTEM.md.
- Comments explain *why*, not *what*.

---

## Testing and verification

There is no unit-test suite. Changes are verified by:

1. `npx tsc --noEmit` and `npx eslint .` — both must be clean.
2. `npm run build` — must exit 0.
3. A Playwright pass over the real app against the live database: log in, walk
   every screen, assert no console or page errors, and screenshot.
4. For design work, **computed-style diffing** against the rendered Claude
   Design file rather than eyeballing screenshots — this is how `/admin`
   reached parity.

A demo dataset lives in the live database. Seeded people are identifiable by an
`@wickettest.local` email and a `+44 7700 9xxxxx` phone (Ofcom's reserved
range). Delete on those two markers, never by creation date.

---

## Deployment

Vercel builds every push to `main` and deploys to
**https://wicket-travel-portal.vercel.app**. Per-deployment preview URLs are
SSO-protected — check the alias above rather than a deployment URL.

Environment variables are set in the Vercel project; the same three keys as
`.env.local`.
