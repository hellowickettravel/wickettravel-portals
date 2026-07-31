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
- Next.js scaffolded, pushed to GitHub, deployed on Vercel (https://wicket-fawn.vercel.app/).
- Supabase project created (London region). Keys in .env.local.
- Supabase clients exist: lib/supabase/client.ts (browser), lib/supabase/server.ts (server), lib/supabase/middleware.ts + root middleware.ts (session + route protection for /admin and /employee).
- DB schema live with 6 tables: profiles, customers, conversations, assignments, messages, orders. A trigger auto-creates a profile row on signup. RLS is ON; only a basic "own profile read" policy exists so far — fuller role policies come later.
- Auth = Email + Password. "Confirm email" is OFF.

## Roles
- admin: full control (employees, access levels, all orders/chats, analytics)
- employee: only assigned conversations/orders. Sections: Orders, Messages, Dashboard, Support, Settings.
- customer: logs in to their own portal — places/tracks orders and chats with the team in real time. Cannot message on an order once it's completed/cancelled (enforced server-side via RLS).

## Three portals
- /admin — admin panel
- /employee — employee portal (the heart: 2-pane chat inbox, create order from chat)
- /customer — customer portal: place/track orders, chat with the team in real time

## Design system
**`DESIGN_SYSTEM.md` at the repo root is the working source of truth for code**, extracted
from `design-system.html` (the visual specimen, live at `/style-guide`). Read it before
touching anything visual. The essentials:

- **Light mode only.** There is no dark theme and no `.dark` block.
- **Ocean is the brand** — `#0F4C81` primary / `#0A3A66` deep / `#082F55` night. **Coral is the accent** — `#C0451F`, one per view, maximum.
- **Typefaces:** Hanken Grotesk everywhere · Newsreader italic for one editorial line per page · IBM Plex Mono 500 for codes and uppercase micro-labels. Plus Jakarta Sans, Inter and Poppins are retired.
- **The clipped corner:** surfaces `5px 18px 18px 18px`, controls 8px, badges 6px, icon chips 12px. No uniform-16px radius, no pill buttons.
- **Token source of truth:** CSS variables in `app/globals.css` (`:root`), surfaced via `@theme inline`. Consume tokens (`bg-ocean`, `text-tx-head`, `bg-sky-tint`, `border-line`…) — **never hardcode a hex.** The only two exceptions are documented in §7 of DESIGN_SYSTEM.md.
- **Portal shell:** 272px ocean-gradient sidebar, active nav = solid WHITE pill with a coral icon, 72px white topbar with no brand colour in it, content max 1160px.
- Anything not in DESIGN_SYSTEM.md is not in the system. Don't invent a value — pick the nearest one on the scale.

## Messaging (internal realtime)
- All messaging is internal: admin ⇄ employee ⇄ customer, over Supabase Realtime between logged-in roles. No WhatsApp, no external messaging API, no mock/simulate layer.
- Sender role is labelled in the UI as **Admin**, **Support Team** (employee), or **Customer**.
- Orders carry a human order number (e.g. `#7343490`) and a lifecycle status: `new → in_progress → completed / cancelled`. Customers cannot send messages on a completed/cancelled order — enforced server-side via RLS, not just the UI.
- Realtime is enabled (publication `supabase_realtime`) on conversations, messages, orders, order_messages and order_attachments. RLS scopes every stream: admin sees everything, employee sees only assigned orders/conversations, customer sees only their own.

## Build order
1. Auth + login + role-based redirect — DONE
2. Employee portal: chat inbox UI + internal realtime send — DONE
3. Orders + Dashboard — DONE
4. Admin panel: employees, access levels, analytics — DONE
5. Customer portal: orders + realtime chat — DONE
6. Foundation: orders/order-messages/attachments schema, realtime + RLS — DONE

## Rules
- One feature at a time. Keep code clean and typed.
- Use the locked palette + fonts everywhere.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
