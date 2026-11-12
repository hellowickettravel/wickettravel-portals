# Wicket Travel — portal

Customer, staff, helper and admin app at
[portal.wickettravel.com](https://portal.wickettravel.com).
Next.js 16 (App Router), React 19, Tailwind 4, Supabase. Hosted on **Netlify**.

> Next 16 has breaking changes. Read `node_modules/next/dist/docs/` before
> writing framework code. See `MEMORY.md` for how this connects to the website.

## Local development

```bash
npm ci
npx next dev -p 3200   # http://localhost:3200
npm run build
```

Node 22 (`.nvmrc`). Local dev uses the LIVE Supabase project (see `MEMORY.md`).

## Deploying (Netlify)

Build settings live in `netlify.toml`.

1. In the Netlify project **`wickettravel-portal`**, go to Project configuration →
   Build & deploy → **Link repository**, and pick
   `hellowickettravel/wickettravel-portals` on branch `main`.
2. Set the environment variables below. **Project configuration → Environment
   variables → Import from a .env file** takes a pasted `.env` in one go.
3. Deploy, then add `portal.wickettravel.com` under **Domain management**.
4. In Supabase, go to **Authentication → URL Configuration** and keep
   `https://portal.wickettravel.com/**` in Redirect URLs. Add the
   `*.netlify.app` URL too if you sign in on it before the domain moves.

### Environment variables

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything. Also read at **build** time (CSP, image allowlist), so keep its scope "All". |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything (browser + server Supabase client). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin writes: leads, visa intake, signup. Mark as secret. |
| `VISA_RELAY_SECRET` | Must equal the website's `WICKET_RELAY_SECRET`; lets the portal rate-limit per real visitor. Secret. |
| `HOMEPAGE_ORIGINS` | Optional extra CORS origins, comma-separated. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Outgoing email. Paste `EMAIL_FROM` without quotes. |
| `ORDER_ALERT_EMAIL` | Where new-order alerts go. |

`NEXT_PUBLIC_*` values are baked in at build time: after changing one,
redeploy (**Deploys → Trigger deploy → Clear cache and deploy**).
