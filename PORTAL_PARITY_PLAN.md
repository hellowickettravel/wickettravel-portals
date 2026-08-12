# Portal Parity Plan — bringing /customer, /employee and /helper up to /admin

**Written 2026-08-12, after rounds three and four of the admin portal work
(commits `1681824` and `1aea370`).**

This document exists so the work can be picked up cold, after a context
compaction, by someone (or some session) with no memory of the conversation
that produced it. Everything needed is either here or named by exact path.

---

## 0. How to use this document

1. Read §1 (ground rules) and §2 (what is already done). **§2 matters most** —
   roughly two thirds of the nineteen client findings were fixed in shared
   components and are already live in all four portals. Redoing them is waste;
   the job is to *verify* them and then close the real gaps in §4.
2. Work §4 phase by phase. Each phase names the files, the change, and an
   acceptance test.
3. Use §5's verification protocol. Do not claim a fix without running it.
4. §6 lists what is deliberately deferred and why. Do not silently pick those
   up, and do not silently drop them either.
5. §7 lists traps that already cost real time in this project. Read it before
   debugging anything that looks like CSS, auth or "it works locally".
6. §0b records exactly how far the work has got. Start there.

---

## 0b. STATUS as of 2026-08-12 — read this before doing anything

Most of this plan has already been executed. The working tree builds clean
(`tsc` clean, `eslint` 0 errors, `next build` succeeds). Verify rather than
rebuild.

### Done (in the working tree, not yet committed at time of writing)

| Phase | State | Evidence |
|---|---|---|
| 1 — Employee inbox | **Done** | `components/employee/employee-inbox.tsx` has `isLoading: inboxLoading` asked before the empty state, `ThreadListSkeleton`/`ThreadSkeleton` (lifted into the new `components/admin/inbox-skeletons.tsx`), and a "Mark as read" control |
| 2 — Profile pictures | **Done for admin, customer, employee** | New shared `components/admin/avatar-upload.tsx`, mounted in `app/(admin)/admin/settings/page.tsx`, `components/customer/profile-form.tsx`, `components/employee/settings-form.tsx` |
| 3 — Marketplace realtime | **Done for customer** | `LiveRefresh`/`HowItWorks` in `listings-view.tsx`, `verification-view.tsx`, `listing-detail.tsx` |
| 4 — Layout streaming | **Done for employee + customer** | `navCounts` in `app/(employee)/employee/layout.tsx` and `components/customer/customer-portal-shell.tsx` |
| 5 — Loading gaps | **Done** | All four previously-missing `loading.tsx` now exist; `components/employee/order-create.tsx` gates on `isLoading` with `FormSkeleton` |
| 6 — Helper support | **Server side done, page NOT wired** | `createHelperSupportTicket` + `listMyHelperSupportTickets` in `lib/actions/support.ts`, and `sql/APPLY_HELPER_SUPPORT.sql` exists |
| Branding | **Done** | `components/admin/brand.tsx` (`WicketMark`, `WicketWordmark`) built from the Logo System file, used by `AdminShell`; `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` all replaced |

### NOT done — this is the remaining work, and it is almost entirely the helper portal

1. **`app/(helper)/helper/profile/page.tsx`** — no `AvatarUpload`. The other
   three portals have it. Mount the same shared component.
2. **`components/helper/helper-portal-shell.tsx`** — no `navCounts`; still
   blocks the shell. Apply the §3.4 / Phase 4 pattern.
3. **`app/(helper)/helper/support/page.tsx`** — still the read-only contact
   card. The action and the SQL both exist now, so wire the real form +
   `SupportThread`, and keep it failing soft with the message that names
   `sql/APPLY_HELPER_SUPPORT.sql` until that migration is run.
4. **No `LiveRefresh` anywhere under `app/(helper)`** — `/helper`,
   `/helper/[id]`, `/helper/verify` all still need it.
5. **`components/customer/match-list.tsx`** — the one customer marketplace
   screen still with no realtime and no explainer.

### Blocking / needs the user

- **`sql/APPLY_HELPER_SUPPORT.sql` has NOT been applied** to the live database.
  Until it is, helper ticket inserts are refused by the CHECK constraint and
  the INSERT policy; the action already detects `23514`/`42501` and returns a
  message naming the file. Ask the user to run it.
- The live database was **deliberately wiped by the user on 2026-08-12** —
  one admin profile remains. Seed fixtures before UI verification and delete
  them afterwards (§5.2).


## 1. Ground rules (these are project invariants, not preferences)

- **One component, three portals.** `PageHeader`, `SectionCard`, `StatCard`
  and the old `.wt-*` "second skin" were deleted long ago. When a portal needs
  different behaviour, **generalise the existing component with a prop that
  defaults to the admin's behaviour**. Never fork a component per portal, never
  restyle one in place. This is why most of §2 is already done: the fix landed
  once in a shared file.
- **`.admin-root` is the design system, not the admin role.** `AdminShell`
  puts that class on every portal's root, so the base layer (Instrument Sans,
  canvas, focus ring, cursors, hover/press motion) applies everywhere. A new
  screen must render inside `AdminShell` to inherit it.
- **Ask `isLoading` BEFORE `length === 0`.** Always. The single most-reported
  bug in round three was a list saying "No conversations yet" during its first
  fetch and then contradicting itself.
- **Never `await` decoration.** Badge counts, activity feeds and other
  ornaments stream via `<Suspense>`; they never block the shell.
- **Fail soft on schema.** Every feature that depends on a column or table
  added by an `sql/APPLY_*.sql` must detect its absence and hide the control or
  return an honest error naming the file. `lib/db/errors.ts` has
  `isMissingColumn` / `isMissingTable`.
- **No DDL channel from this environment.** The Supabase MCP connector is
  signed into a different account. Schema changes go into a new
  `sql/APPLY_*.sql` for the user to run in the Supabase SQL editor.
- **Overlays portal to `document.body`.** See §7.1.

---

## 2. Already done and shared — VERIFY ONLY, do not rebuild

These landed in shared code during the admin work and are therefore already
live in `/customer`, `/employee` and `/helper`. Each line says where the fix
lives and how to confirm it in the other portals.

| # | Client finding | Where the fix lives | How to verify in the other portals |
|---|---|---|---|
| 1 | No hand cursor anywhere | `app/globals.css` `@layer base` — **global, unscoped** | Any portal page: every visible `button`/`a[href]`/`select` computes `cursor: pointer` |
| 1 | No hover/press motion | `app/globals.css`, scoped `:is(.admin-root,.ds-root,.auth-root)` | Hover changes colour; `:active` scales to 0.97 |
| 1 | Controls give no feedback | `Btn` `pending` prop in `components/admin/ui.tsx` | Any mutation button shows a spinner + `aria-busy` |
| 1,18 | Bell: no per-item read, not scrollable | `components/admin/admin-bell.tsx` | Bell is scrollable, banded "Last 24 hours"/"Earlier", per-row tick; `basePath` comes from `AdminShell homeHref`, so "View all" lands in the right portal |
| 2 | 404 branding + in-portal 404 | `app/not-found.tsx`, plus `not-found.tsx` + `[...notFound]/page.tsx` in **all four** portal segments | Visit `/customer/nope`, `/employee/nope`, `/helper/nope` → in-shell 404, not the public page |
| 3 | Load more had no load state | `components/admin/load-more.tsx` (`LoadMore`, `arrivedInLastPage`) | Already wired into `components/customer/orders-view.tsx` and `components/employee/orders-view.tsx` |
| 4,14,15 | Dialogs "crash the screen" | `DialogPortal` + `lockScroll` in `components/admin/sheet.tsx`; `.wt-page-enter` fill-mode in `globals.css` | Open any dialog in any portal: scrim's parent is `BODY`, header and sidebar both covered |
| 5 | Order lifecycle | `lib/actions/order-lifecycle.ts`; `components/admin/order-detail.tsx` (admin **and** employee); `components/customer/approve-order.tsx` | Employee semi-admin can Edit/Mark complete; customer sees Approve card |
| 16 | No support reply | `components/admin/support-thread.tsx` | Already mounted in `components/customer/support-view.tsx` and `components/employee/support-view.tsx` |
| 17 | Avatar vs sidebar logo conflated | `AdminShell` `avatarUrl` prop; `lib/actions/account.ts` | All four layouts pass `profile?.avatar_url`; sidebar still uses `business_settings.logo_url` |
| 19 | No attachment download | `components/admin/message-bits.tsx` (`AdminMessageAttachment`) | Used by `employee-inbox.tsx` and `customer/messages-view.tsx` — real blob download, image hover overlay |
| — | Skeleton/loading primitives | `Shimmer`, `KpiSkeleton`, `RowsSkeleton`, `LoadingNote`, `TableSkeleton` in `components/admin/ui.tsx`; `components/admin/skeletons.tsx` | Available to every portal |
| — | Realtime → RSC bridge | `components/admin/live-refresh.tsx` (`LiveRefresh`) | Available; only Analytics uses it so far |
| — | Workflow explainers | `components/admin/how-it-works.tsx` | Available; only the four admin marketplace queues use it so far |

**Phase 0 of the work is to actually run these verifications** and record the
result, because "it's shared so it must work" is an assumption, and this
project has already been bitten by exactly that (see §7.2).

---

## 3. The real gaps, at a glance

Found by auditing the three portals on 2026-08-12. Ordered by severity.

| Gap | Portal(s) | Severity |
|---|---|---|
| Inbox shows "No conversations" during first load | employee | **High — the item-6 bug, still live** |
| Inbox has no mark-as-read, no pending on assign/close, no skeletons | employee | High |
| No profile-picture upload UI | customer, employee, helper | High (item 17 half-done) |
| Marketplace screens have no realtime and no "how it works" | customer, helper | High (items 10–13) |
| Layouts fetch entire inbox + all orders to draw two badges | employee, customer | Medium (perf) |
| `order-create.tsx` has `useQuery` with no loading state | employee | Medium |
| Missing `loading.tsx` on four routes | employee, helper, customer | Low |
| Helper cannot raise a support ticket at all | helper | Medium (needs RLS change) |

---

## 4. The work

### Phase 0 — Verify the shared surface (do this first, ~30 min)

Drive all three portals with the Playwright harness (§5) and assert, per portal:

- every visible control computes `cursor: pointer`;
- every route returns 200, and an unknown route renders the in-shell 404;
- opening any dialog gives `scrim.parentElement.tagName === "BODY"`, and
  `document.elementFromPoint()` over the header returns something inside the
  scrim;
- zero `pageerror` / `console.error`.

**Record the actual numbers.** If anything fails here, fix it before Phase 1 —
it means a shared assumption is wrong.

### Phase 1 — The employee inbox (highest value)

`components/employee/employee-inbox.tsx` is the employee portal's equivalent of
`components/admin/admin-inbox.tsx`, and it never received round three's fixes.

Port these, using `admin-inbox.tsx` as the reference implementation:

1. **Loading before empty.** Around line 234 it renders
   `rows.length === 0 ? "No conversations assigned to you yet…"` with no
   `isLoading` check. Add `const { data, isLoading } = useQuery(...)` and a
   `ThreadListSkeleton` branch ahead of the empty branch. Do the same for the
   message pane (`ThreadSkeleton`).
   - Lift `ThreadListSkeleton` / `ThreadSkeleton` out of `admin-inbox.tsx` into
     a shared module rather than copying them — probably
     `components/admin/inbox-skeletons.tsx`. One component, three portals.
2. **Mark as read.** The employee side already has a real read receipt:
   `assignments.last_read_at`, written by `markConversationRead()` in
   `lib/actions/employee.ts`. Wire a "Mark as read" control with an optimistic
   cache update, exactly as `admin-inbox.tsx` does with
   `markAdminConversationRead`. Note the employee path does **not** need
   `conversation_reads` — that table exists because admins hold no assignment
   row.
3. **Pending states** on every control in the thread header (assign/close/etc.)
   — spinner inside the select, `aria-busy`, disabled while in flight.
4. **Avatars.** `employee-inbox.tsx` already references `avatar` three times;
   confirm it uses the shared `Avatar` with `src` so a colleague's uploaded
   photo appears, and pass the signed-in employee's own `avatar_url` for their
   bubbles (mirror `AdminInbox`'s `currentUserAvatar` prop).

**Acceptance:** load `/employee/messages` with the network throttled; the pane
must never say "No conversations" before the fetch resolves. Mark-as-read
clears the badge instantly and persists across a reload.

### Phase 2 — Profile pictures (item 17) in all three portals

The server side is already role-agnostic and done:
`uploadProfileAvatar(file)` in `lib/storage.ts` (derives the uid from the live
session) and `updateMyAvatar` / `getMyAvatar` in `lib/actions/account.ts`.

Only the UI is missing. Add the same section that
`app/(admin)/admin/settings/page.tsx` has to:

- `components/customer/profile-form.tsx`
- `components/employee/settings-form.tsx`
- `app/(helper)/helper/profile/page.tsx`

**Extract, don't triplicate.** Pull the admin's avatar block into
`components/admin/avatar-upload.tsx` and use it in all four places, including
replacing the admin's inline copy.

Keep the wording that makes the distinction explicit: this is the person's own
picture (account button, inbox rows, chat bubbles) and it is **not** the
sidebar logo. That conflation was the client's actual complaint.

**Acceptance:** upload in each portal → top-right avatar becomes the photo, and
`document.querySelector("aside img")` is unchanged (the sidebar must not move).

### Phase 3 — Marketplace parity for customer + helper (items 10–13)

`components/customer/listings-view.tsx`, `match-list.tsx`,
`verification-view.tsx` and `listing-detail.tsx` are client components that
receive data as props from server pages. They have **zero `useQuery` and zero
`postgres_changes`** — so nothing on the customer or helper side updates when
an admin approves a listing, proposes a match or releases contact. The person
waiting on the decision is the last to know.

These same four components are reused by `/helper` via `basePath` / `audience`
/ `lockKind` props, so fixing them once fixes both portals.

1. **Realtime.** Because these are prop-driven and server-rendered, the right
   tool is the existing `LiveRefresh` (`components/admin/live-refresh.tsx`) —
   drop it into `app/(customer)/customer/parents/page.tsx` and the helper
   equivalents, subscribing to `parent_ticket_listings`,
   `parent_ticket_matches`, `parent_ticket_payments`,
   `parent_ticket_identities`. Do **not** convert these screens to client-side
   fetching; that would ship the dataset to the browser to recompute what the
   server already has.
2. **"How it works".** `components/admin/how-it-works.tsx` is generic. Add a
   customer-voiced and a helper-voiced panel to the parents dashboard and the
   listing screens. The admin's four panels are written from the business's
   side; these must be written from the traveller's / helper's side (what
   happens next, who decides, what they are waiting for).
3. **Loading before empty.** `listings-view.tsx` (~line 190) and
   `match-list.tsx` (~line 92) branch straight to an empty state. With
   server-rendered props the route `loading.tsx` covers first paint, so confirm
   each route *has* one (see Phase 5) rather than adding a redundant client
   check.

**Acceptance:** with an admin approving a listing in one browser session, the
customer's `/customer/parents` updates without a manual reload.

### Phase 4 — Stop the layouts fetching everything for two badges

`app/(employee)/employee/layout.tsx` (~line 110) awaits
`getInboxForEmployee()` **and** `getMyVisibleOrders()` — the entire inbox and
every visible order — purely to compute two numbers. `customer-portal-shell.tsx`
(~line 98) does the same via `getCustomerNavCounts`.

Apply the pattern already used in `app/(admin)/admin/layout.tsx`:

- `buildNav()` returns items carrying `countKey`, not `count`;
- the layout starts `loadNavCounts()` **without awaiting it** and passes the
  promise as `AdminShell`'s `navCounts` prop;
- `AdminShell` already unwraps it with `use()` inside `<Suspense fallback={null}>`.

Also replace the two heavy reads with `count(*)` head queries — the employee
layout does not need the rows, only how many.

**Acceptance:** the sidebar, top bar and page render before the badge numbers
appear. Measure per §5.3 and report the honest delta.

### Phase 5 — Loading and small gaps

- Add `loading.tsx` to: `app/(employee)/employee/settings`,
  `app/(helper)/helper/support`, `app/(customer)/customer/parents/[id]/edit`,
  `app/(helper)/helper/[id]/edit`. Use the shape-matched skeletons in
  `components/admin/skeletons.tsx` (`FormSkeleton`, `DetailSkeleton`,
  `SettingsSkeleton`), never a generic one — a KPI grid on a screen with no
  KPIs makes the layout jump when real content lands.
- `components/employee/order-create.tsx` has a `useQuery` with no loading
  branch. Give it one.
- Sweep every remaining `useQuery` in the three portals and confirm the
  `isLoading`-before-empty ordering.

### Phase 6 — Helper support (needs a schema decision)

`app/(helper)/helper/support/page.tsx` is deliberately an honest contact card,
not the ticket form, because `support_tickets` is gated to
`role IN ('customer','employee')` in RLS *and* in the server action — the form
would fail every time for a helper.

Two options, and this is the user's call, not an implementation detail:

- **(a)** Write `sql/APPLY_HELPER_SUPPORT.sql` widening the insert policy and
  the `submitter_role` check to include `helper`, update
  `createCustomerSupportTicket` (or add `createHelperSupportTicket`), and mount
  the real form plus `SupportThread`. Helpers then get the same reply thread as
  everyone else.
- **(b)** Leave the contact card and document it as intended.

Recommend (a) — a service provider who is owed money needs a tracked channel,
and the reply thread now exists. But **ask before writing the SQL.**

---

## 5. Verification protocol

Do not report a fix without running this. The project has already shipped two
claims that did not survive a proper check.

### 5.1 Environment

```bash
npx next build            # must be clean
npx next start -p 3100    # ONE server only — see §7.3
```

Playwright and Chromium are installed. Import from `playwright` in standalone
`.mjs` scripts under `.qa/` (git-ignored). Assert database effects with the
service-role client — `.qa/db.mjs` wraps it, reading `.env.local`.

### 5.2 Sign-in — read this before writing a login loop

The login brute-force guard is **real and will lock you out**: 6 failed
attempts per email or 10 per IP in a 15-minute window, tracked in
`auth_attempts`. A retry loop re-locks itself, because each failure adds a row.

- Provision a QA user with the service role (`auth.admin.createUser` +
  `profiles.upsert`), email confirmation on.
- **Log in ONCE**, save `storageState` to `.qa/state.json`, and reuse it in
  every subsequent script.
- If locked out: delete the failed rows
  (`auth_attempts` where `success = false` inside the window) — never disable
  the limiter.
- Clean up QA users and rows afterwards; the live database is the client's.

### 5.3 Measuring performance honestly

**A/B or do not claim.** The only trustworthy method:

```
git stash → build → start → measure → git stash pop → build → start → measure
```

Same dataset, same single server, median of ≥7 samples, TTFB via
`performance.getEntriesByType("navigation")[0].responseStart - requestStart`.

Baseline for context: one Supabase round trip is **~180ms** from the app
server; admin page TTFB sits at **~550ms**; soft navigation between admin
screens is **64–113ms**.

### 5.4 Asserting the dialog fix

Do **not** check that the header's width is unchanged — it never changes, and
that check is what let the bug survive round three. Check geometry and paint
order:

```js
const scrim = document.querySelector('[role="dialog"]').parentElement;
scrim.parentElement.tagName === "BODY"            // portalled
scrim.getBoundingClientRect()                      // top 0, left 0, full height
const h = document.querySelector("header").getBoundingClientRect();
scrim.contains(document.elementFromPoint(h.left + h.width/2, h.top + h.height/2))
```

The scrim's width will read ~15px narrower than `window.innerWidth` — that is
the reserved scrollbar gutter (`scrollbar-gutter: stable`), not a gap. Compare
against `document.documentElement.clientWidth`.

---

## 6. Deliberately deferred — do not silently start or drop these

1. **The ~180ms auth win.** `auth.getUser()` is a network call and runs twice
   per request: once in `middleware.ts`, once in the layout. React `cache()`
   cannot dedupe across that boundary. Removing the second means trusting the
   middleware and using `getSession()` (local, no network) in the layout. Real
   win, but only safe once the middleware `matcher` is audited to provably
   cover every portal route. **Ask before doing it.**
2. **Logo and favicon.** Blocked on assets. The Claude Design project
   (`9b565d9c-3267-4d44-826f-0d566a657036`) 404s from this environment — no
   design authorization — and the shared artifact returns *"this artifact is
   served to you as a public (non-member) reader, and reading public artifacts
   that way is not enabled yet"*. Unblock by pasting the SVG source or dropping
   files into `public/`. The sidebar already accepts `logoUrl`; the favicon is
   `app/icon.png` / `app/favicon.ico` (note: `app/` wins over `public/`).
3. **Seeded marketplace demo data.** The parents queues are empty because the
   feature is genuinely step 3 of 4 — rows only exist as consequences of
   decisions on other screens. Explainers were added instead of fake rows,
   deliberately, right after the client asked for 52 fake orders to be deleted.
   Offer a demo seed; do not add one unasked.

---

## 7. Traps that already cost real time here

1. **`position: fixed` is not fixed to the viewport if any ancestor has a
   transform.** `.wt-page-enter` used `animation-fill-mode: both`, which pins
   the final keyframe forever; that keyframe's `transform: none` computes to
   `matrix(1,0,0,1,0,0)` — a real transform. It became the containing block and
   stacking context for every modal: the scrim measured 1105×560 on a 1440×900
   screen, leaving the header and sidebar outside it and painting over the
   dialog. Fixed twice over (fill-mode `backwards`, and `DialogPortal`).
   **Never diagnose a "z-index problem" without first checking every ancestor's
   computed `transform` / `filter` / `backdrop-filter` / `will-change` /
   `contain`.** Portalled overlays must repeat `admin-root` — they no longer
   inherit it.
2. **A shared component is not proof of a shared fix.** `OrderDetail` is
   rendered by the employee portal but called `requireAdmin()`-guarded actions,
   so a semi-admin's Edit and Mark-complete could never succeed. It looked fine
   in `/admin`. Test every shared component **in every portal that mounts it**.
3. **Kill stray servers before measuring.** Two `next start` processes on one
   box silently halved throughput and produced a performance number that could
   not be reproduced. `ps -eo pid,args | grep next-server` — expect exactly one.
4. **Tailwind v4 dropped `button { cursor: pointer }` from preflight.** Fixed
   once in the `globals.css` base layer. Never patch this per-component.
5. **`"use server"` modules may only export async functions.** Constants and
   sync helpers must live elsewhere — that is why `lib/db/errors.ts` and
   `lib/orders/lifecycle.ts` exist.
6. **`sql/APPLY_ADMIN_ROUND3.sql` is applied** (2026-08-12): `orders.delivered_at`,
   `profiles.avatar_url`, `support_messages`, `conversation_reads`. The
   fail-soft probes stay in the code regardless.

---

## 8. Definition of done

- Every row in §2 verified in all three portals, with recorded evidence.
- Every phase in §4 complete, or explicitly listed as not-done with a reason.
- `npx tsc --noEmit` clean; `npx eslint app components lib` at zero errors
  (four pre-existing warnings are acceptable).
- `npx next build` clean.
- All routes in all four portals return 200; unknown routes render the
  in-shell 404; zero console errors across a full drive of every screen.
- Performance claims backed by a §5.3 A/B, or not made.
- QA users and rows removed from the live database.
- `CLAUDE.md` updated with anything a future session would otherwise
  re-derive; memory updated for cross-session facts.
