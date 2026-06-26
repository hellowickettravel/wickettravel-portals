# Wicket Travel Portal — Full Codebase Overview

> A complete, code-accurate reference for the Wicket Travel Portal. Everything below is derived
> directly from the source (app routes, server actions, database migrations, components and config).
> It is intended to let someone who has never seen this codebase understand exactly how it works.

---

## 1. Project Summary

**What it is.** Wicket is a custom internal web platform for a UK-based flight-ticket reselling
business — a "Shared Team Inbox + Orders CRM + Admin panel". All three roles log in to web portals
(**Admin**, **Employee**, **Customer**) and message each other in real time.

Messaging is **entirely internal**: messages are written to the database and reflected live via
Supabase Realtime between the logged-in roles. There is no WhatsApp, no external messaging API and no
mock/simulate layer — the realtime chat is the real, final messaging transport.

**Purpose.**
- Let staff manage customer conversations (a two-pane realtime inbox).
- Turn conversations into **orders** (flight bookings with route, dates, pricing, commission).
- Give admins full control: employees, access levels, customers, orders, analytics, business settings.
- Give customers an optional self-service portal: request quotes, track orders, chat, raise support.

**Tech stack (from `package.json`).**

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | `16.2.9` |
| Language | TypeScript | `^5` |
| UI runtime | React / React DOM | `19.2.4` |
| Styling | Tailwind CSS | `^4` (via `@tailwindcss/postcss`) |
| UI components | shadcn-style components + `@base-ui/react` | shadcn `^4.11.0`, base-ui `^1.5.0` |
| Data fetching/cache | TanStack Query (+ devtools) | `^5.101.0` |
| Backend (DB/Auth/Realtime/Storage) | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | js `^2.108.2`, ssr `^0.12.0` |
| Icons | `lucide-react` | `^1.20.0` |
| Toasts | `sonner` | `^2.0.7` |
| Theming helper | `next-themes` | `^0.4.6` (light-only in practice) |
| Class utilities | `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css` | — |
| Hosting | Vercel (`https://wicket-fawn.vercel.app/`); repo on GitHub | — |
| Region | Supabase project in London | — |

**Auth model.** Email + password (Supabase Auth) plus Google OAuth. Email confirmation is supported
in the flow (signup shows a "check your email" state), and there is a full password-reset flow.

---

## 2. Architecture

### Folder layout (no `src/` directory — `app/` and `lib/` live at the repo root; `@/*` aliases the root)

```
app/                      Next.js App Router (routes, layouts, API routes)
  (admin)/admin/...       Admin portal route group
  (employee)/employee/... Employee portal route group
  (customer)/customer/... Customer portal route group
  (auth)/...              login / signup / reset-password
  api/signup-profile/     Route handler that finalizes public sign-ups
  auth/callback/          OAuth + email-verification PKCE callback
  layout.tsx              Root layout (fonts, providers, toaster)
  page.tsx                Root: redirects to login or role dashboard
  providers.tsx           TanStack Query provider
  globals.css             Tailwind theme + locked brand palette

components/
  ui/                     shadcn-style primitives (button, dialog, table, sheet, ...)
  portal/                 Shared portal pieces (PortalShell, ConversationInbox, NotificationsBell, ...)
  admin/                  Admin-only widgets (page-header, stat-card, reset-everything, ...)
  employee/               Employee views (orders-view, order-detail, settings-form, support-view, ...)
  customer/               Customer views (dashboard, customer-nav, profile-form, support-view)
  auth/                   Auth screen pieces (aside panel, google button, divider, footer)
  icons/                  Custom SVG (Google)

lib/
  supabase/               client.ts (browser), server.ts (SSR), admin.ts (service-role), middleware.ts
  actions/                "use server" server actions (admin, employee, customer, auth, support,
                          notifications, dev, account)
  db/                     RLS-aware read helpers + hand-written types (types.ts)
  access.ts               Employee ACCESS-LEVEL matrix (single source of truth)
  auth.ts                 getUserAndProfile(), roleDashboardPath(), isDeactivated()
  storage.ts / storage-server.ts   Private-attachment upload + signed-URL read
  format.ts, csv.ts, query-keys.ts, utils.ts   helpers
  hooks/, mock/           list-control hook; mock data stubs

hooks/use-mobile.ts       viewport hook
proxy.ts                  Next 16 "proxy" (formerly middleware) — session refresh + route protection
supabase/migrations/      0002–0016 SQL: schema, RLS, triggers, storage policies
```

### How the app is organized

- **Route groups** `(admin)`, `(employee)`, `(customer)`, `(auth)` map to the three portals plus the
  auth screens. Each portal group has its own `layout.tsx` that enforces the role and renders the
  shared shell.
- **Server Components by default.** Pages that need only server data (dashboards, detail pages,
  message inbox host pages) are async server components. Interactive screens (lists with
  search/filter, settings forms, the chat inbox body, dialogs) are `"use client"` and use TanStack
  Query against server actions.
- **Server Actions** (`lib/actions/*.ts`, all `"use server"`) are the write/RPC layer. Client
  components call them directly as async functions; they run on the server with the user's session.
- **Three Supabase clients:**
  - `lib/supabase/client.ts` — browser (anon key), used in client components and realtime.
  - `lib/supabase/server.ts` — SSR cookie-bound (anon key), respects RLS as the signed-in user.
  - `lib/supabase/admin.ts` — **service role**, **bypasses RLS**, server-only. Used only after an
    explicit role check, for privileged operations (creating users, deletes, injecting inbound
    messages, reading the business logo for non-admins).

### Data flow

1. A request hits `proxy.ts` → `updateSession()` refreshes the Supabase session cookie and redirects
   unauthenticated users away from `/admin`, `/employee`, `/customer`.
2. The portal `layout.tsx` loads `getUserAndProfile()` and enforces role (and access level / active
   status), then renders the shell.
3. Pages either read directly through RLS-aware `lib/db/*` helpers (server) or, on the client, call
   server actions via TanStack Query.
4. Writes go through server actions; the database additionally enforces access through **Row-Level
   Security (RLS)** policies and **triggers**, so the database — not just the UI — is the gate.
5. **Supabase Realtime** pushes row changes (messages, conversations, orders, notifications, support
   tickets, business settings) to subscribed clients; RLS still applies to realtime events, so each
   user only receives changes for rows they can read.

---

## 3. User Roles & Access Levels

The role lives on `profiles.role` (`admin` | `employee` | `customer`). For employees there is a
second dimension, `profiles.access_level`, defined as the single source of truth in `lib/access.ts`.

### ADMIN
- **Login:** email+password or Google, same login screen as everyone. After sign-in the role is read
  and the user is sent to `/admin`.
- **Access:** everything. RLS gives admins `for all` on every table via the `is_admin()` helper.
- **Pages:** Dashboard, Employees, Customers, Orders, Messages, Analytics, Support, Settings (plus
  detail pages for orders/employees/customers).
- **Permissions / actions:** create/edit/deactivate/delete employees, reset employee passwords,
  set employee access levels; create customers and fully delete them; create/edit orders, change
  status, assign orders to employees; reply in *any* conversation, assign/close conversations;
  configure business settings + logo; view analytics; resolve support tickets; route conversations
  to employees (dev tools); and a destructive **Reset Everything** portal wipe.
- **Enforcement:** `app/(admin)/admin/layout.tsx` redirects non-admins to their own dashboard;
  every admin server action calls `requireAdmin()` (re-checks `profile.role === 'admin'`); RLS
  `*_admin_all` policies back this at the DB. Privileged writes use the service-role client only
  *after* `requireAdmin()`.

### EMPLOYEE
- **Login:** same login screen → routed to `/employee`. Employees are **never** self-registered;
  an admin creates them via `createEmployee` (service role), which sets `role='employee'` and an
  access level explicitly.
- **Access:** scoped to conversations/orders assigned to them (RLS via `is_assigned_to_conversation`,
  `created_by = auth.uid()`, etc.).
- **Pages:** Dashboard, Messages, Orders, Support, Settings (which sections appear depends on access
  level — see matrix).
- **Access levels** (`lib/access.ts`, gated in nav, route guards, server actions **and** RLS):

  | Level | Dashboard | Messages | Orders | Support | Settings |
  |---|---|---|---|---|---|
  | `full` | ✓ | read + reply | read + **create** | ✓ | ✓ |
  | `semi_admin` | ✓ | read + reply | read + create + **edit + status** | ✓ | ✓ |
  | `chat_only` | ✓ | read + reply | **no orders at all** | ✓ | ✓ |
  | `view_only` | ✓ | **read-only** (can't reply) | read-only | ✓ | ✓ |

  Helper functions: `normalizeAccess()` (defaults unknown/null to the **least** privileged
  `view_only`), `canAccessSection()`, `isReadOnly()`, `canCreateOrders()` (full+semi_admin),
  `canEditOrders()` (semi_admin only).
- **Enforcement (defense in depth):**
  1. Nav links filtered by `canAccessSection()` in the employee layout.
  2. Route guards: e.g. `/employee/orders` redirects to `/employee` if `chat_only`.
  3. Server actions re-check access (`sendMessage` blocks `view_only`; `createOrderFromChat`
     requires create rights; `updateEmployeeOrder` / `setEmployeeOrderStatus` require `semi_admin`).
  4. RLS policies (migrations 0011/0013) enforce the same matrix at the database via
     `employee_access_level()`, so even a direct supabase-js call can't bypass it.

### CUSTOMER
- **Login:** public **signup** (`/signup`) creates a customer (email verification), or Google OAuth,
  or an admin can create one directly (`createCustomer`). The DB trigger defaults any auto-created
  profile to the **least-privileged `customer`** role (migration 0011), and `/api/signup-profile` /
  the OAuth callback force `role='customer'` and link a `customers` row (`profile_id = auth.uid()`).
- **Access:** only their own data. RLS: `owns_customer`, `owns_conversation`,
  `orders_select_customer`, `messages_select_customer`.
- **Pages:** Dashboard, Book a Flight, My Orders, Messages, Support, Profile.
- **Permissions / actions:** request a flight quote (`createQuoteRequest`), view their own orders
  (with quote prices the team sets), chat with the team (`sendCustomerMessage` — stored as
  `incoming`), upload attachments into their own conversation, raise support tickets
  (`createCustomerSupportTicket`), edit their own name/phone and change password.
- **Enforcement:** `app/(customer)/customer/layout.tsx` requires `role==='customer'`; customer
  actions reject non-customer sessions; customer-created orders are inserted with the service-role
  client *after* confirming the session owns the `customers` row (there is intentionally no customer
  orders-insert RLS policy).

> **Note:** customers have a **full portal** — login, dashboard, orders, realtime chat and support.
> Messaging across all three roles runs on internal Supabase Realtime (no WhatsApp / external API).

---

## 4. Features & Functionality

### Authentication & onboarding
- **Login** (`app/(auth)/login/page.tsx`): email+password, Google button, "Forgot password?" (sends
  reset email, neutral message to avoid account enumeration), surfaces redirect errors
  (`no_access`, `account_deactivated`, `auth`), blocks deactivated accounts, routes by role.
- **Signup** (`app/(auth)/signup/page.tsx`): name/email/password/confirm, 8-char minimum, duplicate
  detection, posts to `/api/signup-profile` to force the customer role, then shows a "check your
  email" state.
- **Reset password** (`app/(auth)/reset-password/page.tsx`): only allows a password change inside a
  genuine PKCE/recovery flow; otherwise shows an "invalid/expired" state. Signs the user out after a
  successful change.
- **OAuth / verification callback** (`app/auth/callback/route.ts`): exchanges the code for a session,
  provisions brand-new OAuth users as customers (never downgrades existing admins/employees), links
  a `customers` row, redirects to the role dashboard.

### Admin features
- **Dashboard** (`/admin`): stat cards (employees, conversations, orders, this-month commission),
  recent-activity feed merged from orders/messages/assignments (`lib/db/activity.ts`), latest orders
  table.
- **Employees** (`/admin/employees` + `[id]`): searchable list; **Add Employee** dialog
  (`createEmployee`, service role, confirmed user, sets access level); edit (`updateEmployee`);
  **deactivate/reactivate** (`setEmployeeActive` — bans/unbans at the auth layer so even live
  sessions die on next token refresh); **delete** (`deleteEmployee` — detaches authored orders /
  sent messages, removes assignments, deletes profile + auth user); **password reset**
  (`resetEmployeePassword` returns a generated temp password to hand over). Detail page shows orders
  created + assignment count.
- **Customers** (`/admin/customers` + `[id]`): list enriched with order + conversation counts
  (`listCustomersWithStats`); **Add Customer** dialog (`createCustomer` — service role, confirmed
  login + linked `customers` row); CSV export; detail page with orders + conversations and a
  **Danger Zone** full delete (`deleteCustomer` — removes chats/messages/assignments, keeps orders
  for revenue history with `customer_id` nulled, removes the auth login if it's a portal customer).
- **Orders** (`/admin/orders` + `[id]`): tabbed list (All/Open/Closed/Cancelled), search, pagination,
  CSV export; **New Order** dialog (`createOrder`); detail page edits trip+pricing (`updateOrder`),
  changes status (`setOrderStatus`, stamps/clears `closed_at`), and assigns an employee
  (`assignOrder`).
- **Messages** (`/admin/messages`): full-access inbox via the shared `ConversationInbox` (scope
  `admin`) — every conversation, reply anywhere (`adminSendMessage`), reassign
  (`setConversationAssignee`), close/reopen (`setConversationStatus`). `InboxTools` exposes the
  **conversation-routing tool** (`lib/actions/dev.ts`): **assign conversation** — routes a customer
  conversation to an employee so it lands in their live inbox.
- **Analytics** (`/admin/analytics`): date-range selector (30d/90d/6m/all); KPI stat cards; CSS bar
  charts and a donut for order status; revenue/commission breakdowns — all computed from `getOrders()`.
- **Support** (`/admin/support`): support-ticket queue (employee- and customer-submitted), All/Open/
  Resolved tabs, realtime refresh, resolve/reopen (`setSupportTicketStatus`).
- **Settings** (`/admin/settings`): business profile (name/email/phone/address/default commission —
  `saveBusinessSettings`), **logo upload** to the public `branding` bucket (`uploadBrandingLogo` +
  `saveBrandLogo`), personal notification preferences, and the **Reset Everything** danger zone
  (`resetEverything` — type-to-confirm + password re-auth, wipes all data + non-admin accounts +
  attachments, preserves the acting admin and business settings).

### Employee features
- **Dashboard** (`/employee`): inbox/open-orders stats and recent assigned conversations + orders.
- **Messages** (`/employee/messages`): the **two-pane realtime inbox** (`ConversationInbox`,
  scope `employee`) — assigned conversations on the left with unread badges (computed from
  `assignments.last_read_at`, migration 0005), live chat thread on the right, send replies
  (`sendMessage`), upload attachments, mark-read (`markConversationRead`), and **Create order
  from chat** (`createOrderFromChat`). Read-only/permissions reflected per access level.
- **Orders** (`/employee/orders` + `[id]`): list of visible orders; `semi_admin` can edit/change
  status (`updateEmployeeOrder`, `setEmployeeOrderStatus`); blocked entirely for `chat_only`.
- **Support** (`/employee/support`): raise internal tickets (`createSupportTicket`), see own tickets,
  and an "Email admin" mailto using the business contact email (`getSupportContactEmail`).
- **Settings** (`/employee/settings`): change own display name (`updateMyName`), change password,
  notification preferences.

### Customer features
- **Dashboard** (`/customer`): personalized greeting + overview (`components/customer/dashboard.tsx`).
- **Book a Flight** (`/customer/book`): trip form (one-way/return, cabin, passengers, dates, notes)
  → `createQuoteRequest` (creates an `open` order, `created_by` null, tied to the customer's
  conversation so staff see it in context).
- **My Orders** (`/customer/orders`): realtime list of own orders with quote prices and statuses.
- **Messages** (`/customer/messages`): chat with the team (`getMyThread`, `sendCustomerMessage`),
  attachment upload; a conversation is auto-created on first visit so the composer is always live.
- **Support** (`/customer/support`): raise a support query that lands in the admin queue.
- **Profile** (`/customer/profile`): edit name/phone, change password.

### Cross-cutting features
- **Notifications** (`components/portal/notifications-bell.tsx` + `lib/actions/notifications.ts`):
  a real bell shared by all portals. Rows are fan-out (one per recipient) written by **SECURITY
  DEFINER triggers**, gated by per-user `notification_prefs`. Types: `new_message`, `new_order`,
  `assignment`, `status_change`, `support_ticket`. Carries an actor (so it can render "You…" vs a
  name) and deep-links (e.g. `…/messages?c=<conversation_id>`). Unread badge, mark-one/mark-all read,
  realtime inserts. Staff and customers each only ever receive their own targeted notifications.
- **Attachments** (`lib/storage.ts` + `lib/storage-server.ts`): private `attachments` bucket. Files
  upload to `conversation/<conversation_id>/<file>`; storage RLS ties access to conversation
  participants; reads are resolved to **short-lived signed URLs** server-side (1-hour TTL). Allowed:
  PNG/JPG/PDF, max 10 MB. Legacy public URLs are transparently re-signed.
- **CSV export** (`lib/csv.ts`): client-side RFC-4180 CSV download for customers/orders lists.
- **Internal realtime messaging:** `sendMessage` / `adminSendMessage` / `sendCustomerMessage` write
  to the DB; every participant's client receives the change live via Supabase Realtime (RLS-scoped).
  This is the final transport — there is no external messaging API.

---

## 5. Pages / Routes Map

| Path | Type | Purpose | Who can access |
|---|---|---|---|
| `/` | Server | Redirect to `/login` or the role dashboard | Anyone |
| `/login` | Client | Sign in (email/pw + Google), forgot-password | Public |
| `/signup` | Client | Create a customer account | Public |
| `/reset-password` | Client | Set a new password (recovery flow only) | Recovery link holders |
| `/auth/callback` | Route handler | OAuth + email-verification code exchange | Public (callback) |
| `/api/signup-profile` | Route handler (POST) | Force new signups to `customer` + link customer row | Signup flow |
| `/admin` | Server | Admin dashboard | Admin |
| `/admin/employees` · `/[id]` | Client / Server | Employee management + detail | Admin |
| `/admin/customers` · `/[id]` | Client / Server | Customer management + detail (danger zone) | Admin |
| `/admin/orders` · `/[id]` | Client / Server | Orders list + detail (edit/status/assign) | Admin |
| `/admin/messages` | Server (hosts client inbox) | Full inbox + conversation routing tools | Admin |
| `/admin/analytics` | Server | Revenue/commission/status analytics | Admin |
| `/admin/support` | Client | Support-ticket queue | Admin |
| `/admin/settings` | Client | Business settings, logo, prefs, Reset Everything | Admin |
| `/employee` | Server | Employee dashboard | Employee |
| `/employee/messages` | Server (hosts client inbox) | Assigned conversations inbox + reply | Employee (all levels; reply needs ≠ view_only) |
| `/employee/orders` · `/[id]` | Server (client view) | Orders list + detail | Employee `full`/`semi_admin`/`view_only` (not `chat_only`) |
| `/employee/support` | Server (client view) | Raise/track internal tickets | Employee |
| `/employee/settings` | Server (client view) | Name/password/prefs | Employee |
| `/customer` | Server | Customer dashboard | Customer |
| `/customer/book` | Client | Request a flight quote | Customer |
| `/customer/orders` | Client | Track own orders | Customer |
| `/customer/messages` | Client | Chat with the team | Customer |
| `/customer/support` | Server (client view) | Raise a support query | Customer |
| `/customer/profile` | Server (client form) | Edit name/phone, change password | Customer |

Each route group also has `loading.tsx` skeletons. The app has root `error.tsx` and `not-found.tsx`.

---

## 6. Database / Data Model

Postgres on Supabase. Hand-written types live in `lib/db/types.ts`; the live schema is reconciled by
the migrations in `supabase/migrations/`. RLS is ON for every table.

### Core tables

- **`profiles`** (`id` = `auth.users.id`): `full_name`, `role` (`admin|employee|customer`),
  `access_level` (`full|semi_admin|chat_only|view_only`, nullable), `is_active` (default true),
  `email`, `created_at`. A signup trigger (`handle_new_user`) auto-creates a row defaulting to
  `role='customer'` (least privilege). A column-guard trigger blocks non-admins from changing
  `role`/`access_level`/`is_active` on their own row.
- **`customers`**: `id`, `profile_id` (→ `auth.users`, **null for phone-only leads**, set for
  portal accounts), `wa_phone` (nullable; surfaced in the UI as "Phone"), `name`, `created_at`.
- **`conversations`**: `id`, `customer_id` (→ customers), `status` (`open|closed`),
  `last_message_at` (auto-bumped by a trigger on new messages), `created_at`.
- **`assignments`**: `id`, `conversation_id`, `employee_id` (→ profiles), `last_read_at` (per-employee
  read tracking), `created_at`. Links employees to the conversations they handle.
- **`messages`**: `id`, `conversation_id`, `direction` (`incoming|outgoing`), `body`, `media_url`
  (stored as a storage **path**, re-signed on read), `sender_id` (profile id for outgoing; null for
  incoming), `created_at`.
- **`orders`**: `id`, `order_number` (unique human ref like `#7343490`, auto-generated by trigger),
  `conversation_id` (nullable), `customer_id` (nullable), `route_from`, `route_to`, `travel_date`,
  `return_date`, `passengers`, `status` (`new|in_progress|completed|cancelled`), flight detail fields
  (`trip_type` `direct|connection`, `adults`, `children`, `child_ages` int[], `wheelchair`,
  `extra_luggage`, `extra_luggage_kg`, `cabin_class`, `passenger_names` text[]), pre-order
  `customer_note`, `selling_price`, `cost_price`, `commission`, `notes`, `created_by` (nullable —
  null for customer-created), `assigned_employee_id` (→ profiles), `closed_at` (completion stamp; set
  when status becomes `completed`), `created_at`.
- **`order_messages`**: `id`, `order_id` (→ orders, cascade), `sender_id` (→ profiles), `sender_role`
  (`admin|employee|customer`), `body`, `media_url`, `created_at`. Per-order chat thread. RLS:
  admin all; employee only assigned orders; customer only own — and customers **cannot insert** once
  the order is `completed|cancelled` (`order_is_locked()`). Streamed live via Realtime.
- **`order_attachments`**: `id`, `order_id`, `message_id` (nullable — null = pre-order note
  attachment), `uploaded_by`, `uploader_role`, `storage_path`, `file_name`, `mime_type`,
  `size_bytes`, `created_at`. Files live in the private `order-attachments` bucket.

### Supporting tables

- **`business_settings`** (single row, `id=1`): `business_name`, `business_email`, `business_phone`,
  `business_address`, `default_commission`, `logo_url`, `updated_at`. Admin-only via RLS (logo read
  for everyone via service-role helper).
- **`notifications`**: `id`, `recipient_id` (→ profiles), `type`, `title`, `body`, `link`, `is_read`,
  `actor_id`, `actor_name`, `created_at`. One row per recipient; written only by SECURITY DEFINER
  triggers; users read/update only their own (`recipient_id = auth.uid()`).
- **`notification_prefs`** (PK `user_id`): `new_message`, `new_order`, `status_change`,
  `daily_summary`, `updated_at`. Gates which notifications get created.
- **`support_tickets`**: `id`, `employee_id` (nullable), `customer_id` (nullable), `submitter_role`
  (`employee|customer`), `subject`, `message`, `status` (`open|resolved`), `created_at`,
  `resolved_at`. A check constraint ensures exactly one submitter matches `submitter_role`.

### Relationships (summary)

```
auth.users 1─1 profiles
profiles 1─0..1 customers          (customers.profile_id; null = phone-only lead)
customers 1─* conversations 1─* messages
conversations *─* employees        (via assignments)
customers 1─* orders               (orders.customer_id, nullable)
conversations 1─* orders           (orders.conversation_id, nullable)
orders 1─* order_messages 1─0..* order_attachments
profiles 1─* orders                (created_by, assigned_employee_id)
profiles 1─* notifications / notification_prefs / support_tickets
```

### Storage buckets

- **`attachments`** — **private**. Customer documents (passports/IDs/tickets). Path-scoped
  (`conversation/<id>/<file>`); access via conversation-membership RLS; reads via expiring signed URLs.
- **`branding`** — **public**. The business logo only.

### Triggers & functions (migrations 0002–0015)

- `handle_new_user` — auto-create profile (`customer` default) on signup.
- `enforce_profile_update_guard` — blocks non-admins/non-service-role from editing privileged fields.
- `bump_conversation_last_message` — keeps `conversations.last_message_at` fresh.
- `create_notification` + `tg_notify_message` / `tg_notify_order` / `tg_notify_status` /
  `tg_notify_assignment` / `tg_notify_customer_order` / `tg_notify_support_ticket` — fan-out
  notifications honoring prefs, with role-correct recipient sets, actor labels and deep-links.
- Helper predicates (SECURITY DEFINER, bypass RLS internally to avoid recursion): `is_admin`,
  `is_assigned_to_conversation`, `owns_customer`, `owns_conversation`, `employee_sees_customer`,
  `employee_access_level`, `can_access_conversation`, `storage_conversation_id`.
- Realtime publication includes: `messages`, `conversations`, `business_settings`, `notifications`,
  `support_tickets`, `orders`.

---

## 7. Authentication & Security

- **Auth provider:** Supabase Auth (email+password and Google OAuth). Three clients (browser / SSR /
  service-role) keep RLS-as-user separate from privileged operations.
- **Sessions:** cookie-based via `@supabase/ssr`. `proxy.ts` (Next 16's renamed middleware, nodejs
  runtime) runs `updateSession()` on matching routes to refresh the session and **redirect
  unauthenticated users** off `/admin`, `/employee`, `/customer`.
- **Role enforcement (layered):**
  1. **Middleware/proxy** — auth gate for protected route prefixes.
  2. **Layout guards** — each portal layout checks the role and `isDeactivated()`; wrong-role users
     are sent to *their* dashboard, deactivated users to `/login?error=account_deactivated`.
  3. **Access-level guards** — employee layout filters nav; specific routes (e.g. `/employee/orders`)
     redirect disallowed levels.
  4. **Server actions** — re-check `requireAdmin()` / access level before any write.
  5. **RLS policies** — the database independently enforces visibility and the access matrix, so
     even direct supabase-js calls can't escalate (migrations 0011/0013 plug those holes).
- **Privilege boundaries:**
  - Service-role key is **server-only** and only used after an explicit role check.
  - New auto-created profiles default to **`customer`** (prevents OAuth users from becoming staff).
  - `/api/signup-profile` only provisions when the caller matches the user or the user is a
    brand-new unverified account — a verified account with no matching session can't be downgraded.
  - Deactivation **bans the auth user** (`ban_duration`), so existing tokens die on refresh.
  - **Reset Everything** requires `role==='admin'` *and* a server-side password re-authentication
    before wiping anything.
- **Attachment security:** private bucket + conversation-scoped RLS + short-lived signed URLs;
  customer documents are never reachable via a guessable public URL.
- **Account enumeration:** login/forgot-password and signup return neutral messages so existence of
  an email isn't revealed.

---

## 8. Current Color Scheme & Design

The full theme is defined in **`app/globals.css`** (Tailwind v4 `@theme inline` + `:root` CSS
variables). The app is intentionally **light-mode only** (no `.dark`, `color-scheme: light`).

### Brand palette (LOCKED)

| Token | Hex | Usage |
|---|---|---|
| `--brand` / primary | `#0088CC` | Primary actions, active nav pill, focus ring |
| `--brand-dark` | `#0066A1` | Hover, secondary text on chips |
| `--navy` | `#1E3A5F` | Headings, dark sidebar background |
| `--chip` | `#E1F0F9` | Chips, avatar backgrounds, secondary/accent |
| `--surface` | `#FFFFFF` | Cards, surfaces, topbar |
| `--neutral` (`--color-neutral-soft`) | `#F8FBFE` | Muted input backgrounds |
| `--outline` | `#DDE7EF` | Borders |
| `--bg` / background | `#EDF2F7` | App background (soft gray) |
| `--foreground` | `#0F172A` | Body text |
| `--muted-foreground` | `#64748B` | Secondary text |
| `--input` | `#CDD9E5` | Input borders |
| `--destructive` | `#DC2626` | Danger/delete actions |

### Sidebar (dark navy rail on a light app)

| Token | Hex |
|---|---|
| `--sidebar` | `#1E3A5F` |
| `--sidebar-foreground` | `#CFE0F0` |
| `--sidebar-primary` | `#0088CC` |
| `--sidebar-accent` | `#2A4A73` |
| `--sidebar-border` | `#2A4A73` |

### Chart palette
`--chart-1 #0088CC`, `--chart-2 #0066A1`, `--chart-3 #1E3A5F`, `--chart-4 #38BDF8`, `--chart-5 #7DD3FC`.

### Typography (Google fonts via `next/font`, wired in `app/layout.tsx`)
- **Outfit** → headings (`--font-outfit`, utility `font-display`, applied to `h1–h4`).
- **Inter** → body (`--font-inter`, the default `font-sans`).
- **Montserrat** → labels/eyebrows (`--font-montserrat`, utility `font-label`, uppercase tracking).

### Shape, spacing, effects
- `--radius: 0.75rem`; cards land ~14–16px via `rounded-xl`. Scaled radius tokens `radius-sm…4xl`.
- Custom `shadow-card` utility — soft navy-tinted SaaS shadow.
- `bg-dot-grid` utility — faint dot texture for the login hero panel.
- **Portal shell:** ~260px dark navy sidebar, active nav = solid primary pill, content capped at
  `max-w-6xl` (~1152px), 16px topbar with notifications bell + avatar menu. Mobile collapses the
  sidebar into a `Sheet` drawer.
- **Status badges:** colored `bg`+`text` pairs with a small dot (`components/admin/status-badge.tsx`),
  tones blue/green/red/amber for order/conversation/ticket states.

UI primitives in `components/ui/` are shadcn-style (built on `@base-ui/react`) and consume these
tokens, so a redesign can largely be driven from the CSS variables above.

---

## 9. Key Config & Environment

### Config files
- `next.config.ts` — minimal (defaults).
- `proxy.ts` — session refresh + protected-route redirects (Next 16 "proxy"; matcher excludes static
  assets/images).
- `tsconfig.json` — `@/*` path alias points to the repo root.
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin.
- `eslint.config.mjs` — `eslint-config-next`.
- `components.json` — shadcn component config.
- `app/globals.css` — theme/palette/fonts.
- `app/providers.tsx` — TanStack Query client (30s stale time, no refetch-on-focus, 1 retry).

### Environment variables (names only)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (browser + server).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (browser + SSR, RLS-bound).
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, bypasses RLS; never exposed to the client.
- `NODE_ENV` — standard; gates the React Query devtools.

No `.env` file is committed (kept in `.env.local` locally / Vercel project settings). Messaging is
fully internal (Supabase Realtime), so no external messaging-provider credentials are required.

---

## 10. Notes / Observations

- **Messaging is fully internal.** Admin ⇄ employee ⇄ customer chat runs over Supabase Realtime
  between logged-in roles; writes go to the DB and every authorised client receives the change live
  (RLS-scoped). There is no WhatsApp, no external messaging API and no mock/simulate layer — this is
  the final transport.
- **All three roles log in.** Customers have a complete portal (signup, dashboard, orders, realtime
  chat, support). Treat the live code as the source of truth.
- **Migrations are append-only and idempotent**, numbered `0002`–`0016` (there is no `0001` in the
  repo — the initial 6-table schema predates these files). They document a clear evolution: RLS →
  inbox/read-tracking → customer messaging & settings & storage → order management → notifications →
  security hardening (safe default role + access-matrix RLS) → semi_admin → private attachments →
  customer notifications & support → orders/order-messages/attachments schema + realtime + RLS
  foundation. There's no Supabase CLI wiring yet — types in `lib/db/types.ts`
  are hand-maintained ("replace with `supabase gen types` once the CLI is wired up").
- **Defense in depth is a deliberate theme:** the access matrix is enforced in nav, route guards,
  server actions **and** RLS; privileged writes always re-check role before using the service role.
- **Some code comments are in Roman-Urdu/Hindi** (e.g. in `proxy.ts`/`server.ts`) — functional notes,
  not English-only.
- **`lib/mock/` and `hooks/use-mobile.ts`** exist as scaffolding/helpers; mock data files are stubs
  from earlier batches.
- **External-site integration point:** because everything is keyed off Supabase Auth + a `customers`
  row (`profile_id = auth.uid()`), an external marketing site could create quote-request orders or
  customer accounts by calling the same Supabase project / server actions, or a future public API
  could reuse `createQuoteRequest`. The notification + realtime plumbing would surface those events to
  staff automatically.
- **Destructive operations are guarded but real:** `deleteEmployee`, `deleteCustomer`, and especially
  `resetEverything` permanently remove data/accounts; `resetEverything` preserves only the acting
  admin and business settings.

---

*Document generated from a read-only analysis of the codebase. No application code was modified.*
