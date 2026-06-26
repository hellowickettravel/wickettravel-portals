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
