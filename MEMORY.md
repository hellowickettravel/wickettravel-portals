# Wicket Travel — project memory

Things that are true of this project, aren't obvious from reading the code,
and cost real time to rediscover. The same file lives at the root of both
repos (Website and Portals), because most of it is about how the two connect.

Last updated: 2026-09-25.

---

## The two projects

| | Website | Portal |
|---|---|---|
| What | Public marketing site | Customer / staff / admin app |
| Live URL | https://www.wickettravel.com | https://portal.wickettravel.com |
| Repo | `zahid-growthnexus/wickettravel-old` | `hellowickettravel/wickettravel-portals` |
| Local dev | http://localhost:3000 (`npm run dev`) | http://localhost:3200 (`npx next dev -p 3200`) |
| Stack | Next 16.2.9, React 19.2.4, Tailwind 4 | Same, plus Supabase |

They deploy from **different Vercel accounts** and **different GitHub owners**.
The Website repo is named `-old`; confirm it is really the repo production
deploys from before relying on that.

**This is not the Next.js you know.** Next 16 has breaking changes; read
`node_modules/next/dist/docs/` before writing framework code. Examples that
have already caught us: `error.tsx` receives `unstable_retry`, not `reset`;
`params` is a Promise; `middleware` is now `proxy`.

---

## How the website talks to the portal

- The Website never calls the portal from the browser. Three **server-side
  relays** forward to it: `/api/parent-ticket`, `/api/parent-ticket/public`,
  `/api/visa-enquiry`.
- The portal host is **one constant**: `PORTAL_ORIGIN` in `lib/links.ts`
  (`https://portal.wickettravel.com`, the apex; `www.` redirects to it).
  Override server-side with the `PORTAL_ORIGIN` env var — locally,
  `http://localhost:3200`.
- **Never put a Vercel deployment URL there.** The old value,
  `wicket-travel-portal.vercel.app`, stopped resolving and silently took down
  every Assist Family lead, every visa lead and the whole public board.
- **`WICKET_RELAY_SECRET`** (Website) must equal **`VISA_RELAY_SECRET`**
  (Portal). Without it the portal rate-limits every website visitor as one
  person: 8 submissions per 15 minutes, 25 per day, worldwide.

### Field names differ between the two sides

The portal ignores keys it doesn't know, so a mismatch never errors — the
data just disappears. The Website relay translates at the boundary:

| Website | Portal |
|---|---|
| `languages_spoken` | `languages` |
| `parents_capacity` | `parents_can_help` |
| `assistance_fee` | `fee_amount` |

Also: the search widget shows "Etihad Airways" but the portal's allowlist says
"Etihad" (mapped in `AIRLINE_PARAM`). The portal caps `parents_can_help` at 20.
Whenever you touch either side of this boundary, diff the key names against
the other repo.

The portal's public board **deliberately excludes amounts** for privacy, so
the Website's amount chip can never be filled. That's a product decision still
to be made.

---

## Local development

- **The local portal uses the LIVE Supabase database.** An order, lead or
  email created locally is production data. On 2026-09-20 a verification
  probe accidentally created lead `#PT-1020` ("Audit Probe") — delete it from
  `/admin/parents-tickets` if it's still there.
- Relay endpoints are **module-level constants**. Setting `process.env` inside
  a request handler is too late; use a dynamic `import()` after setting it.
- Folders starting with `_` are private in the App Router and are never routed.
- On Windows, piping `curl` into Python decodes UTF-8 as cp1252 and makes `£`
  look like `Â£`. Read files with explicit `encoding="utf-8"` before reporting
  mojibake.
- `next build` rewrites `tsconfig.json`; `git checkout -- tsconfig.json` after.
- The Claude browser pane often reports zero animation frames when the window
  isn't in front. That freezes framer-motion and fakes bugs. Measure
  `requestAnimationFrame` before diagnosing any animation.

---

## Database migrations (Portal, `supabase/migrations/`)

Additive only: nullable columns, `if not exists`, and an `isMissingColumn()`
fallback so the app runs whether or not a migration has been applied.

| Migration | Status as of 2026-09-22 |
|---|---|
| 0022 person fields (`customers.date_of_birth`) | applied |
| 0023 birthday wishes | applied |
| 0024 order passenger details | **not applied** — the order form silently drops the passenger list until it is |
| 0025 travel details | applied 2026-09-25 |
| 0026 traveller IBE number | **not applied yet** — Travel details works without it; only saving an IBE number is refused until it is |

`orders.passengers` is an **integer headcount**. The passenger list is
`passenger_details` (jsonb). Don't reuse the name.

---

## Travel details (Portal, admin only)

- `/admin/travel-details`: a directory of every person the business books
  for — customers AND the companions on their orders, who have no account.
  Search covers name, email, phone, passport, order number, route and IBE.
- **It fills itself.** Each visit imports orders and customers not yet seen
  (`traveller_imports` marks them), so a traveller the admin deletes is never
  re-created. Matching rules live in `lib/travellers-import.ts` (pure, tested
  by hand with jiti): a same name only merges with a matching DOB, email or
  booker; a differing DOB never merges. Families share emails, so email
  alone never merges either.
- The IBE number belongs to a trip (`traveller_trips.ibe`), not a person.
- An account holder's DOB is read from, and written through to,
  `customers.date_of_birth`, so Birthdays and Travel details agree.
- Birthday wishes: account holders from Birthdays (`birthday_emails`);
  account-less travellers from Travel details (`traveller_birthday_emails`),
  same saved message, footer reworded to "you have travelled with".
- Built without touching existing screens (client's instruction, 2026-09-25):
  `deleteCustomer` and `resetEverything` do NOT clear travellers yet.

## Birthday emails (Portal)

- **Sent by hand, never automatically.** An admin opens `/admin/birthdays`,
  ticks customers and presses Send. There is no cron job anywhere.
- Mail goes over SMTP (`lib/email.ts`): Hostinger, `smtp.hostinger.com:465`,
  from `support@wickettravel.com`.
- Blocked on: **`SMTP_PASS` is empty**, and **no customer has a date of
  birth yet**.
- Vercel needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `EMAIL_FROM`, `SMTP_SECURE`. Paste `EMAIL_FROM` **without quotes** in
  Vercel — `.env.local` strips them, Vercel doesn't.
- The Reply-To is `business_settings.business_email`, currently a Gmail
  address.

---

## SEO

Keyword research uses Google's autocomplete (`suggestqueries.google.com`,
`gl=uk`). A query that returns nothing is a finding, not a failure.

- **"Assist Family" has zero search demand.** People search "airport
  assistance for elderly" and "elderly parent flying alone". Never use the
  product name alone as a page title.
- **Best untapped search demand:** UAE visas for non-British passport holders
  living in the UK ("uae visa for uk brp holders", "dubai visa for indian
  passport holders").
- **Local searches:** "travel agents hounslow", "travel agents in southall".
- Route pages (`/flights/[route]`) come from `lib/routes.ts`, and the page,
  sitemap entry, `/flights` index link and `llms.txt` line all follow from
  one entry. Every route needs its own real content — never swap two city
  names and publish.
- Sitemap `lastModified` is the date the content last really changed, not
  `new Date()`.
- `/llms.txt` is generated (`app/llms.txt/route.ts`) from the same constants
  as the pages. It deliberately contains no rating figure and a "Not what we
  do" section.
- The portal is noindex by default; only `/join-as-helper` is indexed.
  `/customer/book` stays crawlable because the homepage links to it.

### Two public claims waiting on the client (don't change them yourself)

1. **Trustpilot:** the site publishes 4.8 from 12,480 reviews. The real
   profile shows 4.5 from 17. It appears on 5 pages and in homepage schema.
2. **"ATOL-style financial protection"** in `lib/faq.ts`. The company has an
   IATA TIDS number, not an ATOL licence.

---

## Standing instructions from the client

- *"Please don't use any specific religion. Never target any religion-based
  content, because it's not going to be specific for anyone. It's for
  everyone."*
- Main navigation: no "Deals" link; the visa link is labelled "Visa".
