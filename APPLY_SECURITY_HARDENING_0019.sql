-- ============================================================================
-- APPLY_SECURITY_HARDENING_0019.sql — close the public-endpoint bypass
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). Fully idempotent — safe to run again.
--
-- WHY
--   visa_enquiries and parent_ticket_enquiries each carried a
--   `FOR INSERT TO anon` RLS policy so the public homepage form could write a
--   lead. But the homepage does NOT talk to PostgREST directly — it relays to
--   the portal's API routes (/api/visa-enquiry, /api/parent-ticket), which
--   insert with the SERVICE-ROLE key (service role bypasses RLS entirely). So
--   the anon-insert policy is never used by the legitimate flow.
--
--   The problem: NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the browser bundle, so
--   anyone can read it and POST straight to
--       https://<project>.supabase.co/rest/v1/visa_enquiries
--   with the anon key — completely bypassing the API route's server-side
--   validation (email/phone/enum/length checks), CORS, and the per-real-IP
--   rate limiter. An attacker could flood the admin tabs with junk rows, set
--   arbitrary `ip_hash` values to dodge any DB-level throttle, and stuff the
--   `documents` jsonb with arbitrary blobs (the old check only pinned
--   `status` and `admin_notes`).
--
-- FIX
--   Drop both anon-insert policies. Every legitimate submission continues to
--   flow through the validated + rate-limited service-role API route, which is
--   unaffected (service role bypasses RLS). After this, the two tables have
--   ONLY the admin_all policy — anon and non-admin authenticated users match no
--   policy, so they can neither read nor write. Nothing in the app changes.
--
-- VERIFY (optional, after running):
--   select tablename, policyname, roles, cmd
--   from pg_policies
--   where tablename in ('visa_enquiries','parent_ticket_enquiries')
--   order by tablename, policyname;
--   -- Expect ONLY *_admin_all rows; no {anon} policy should remain.
-- ============================================================================

-- Dubai visa enquiries — remove the anon insert path.
drop policy if exists visa_enquiries_anon_insert on public.visa_enquiries;

-- Parents Tickets leads — remove the anon insert path.
drop policy if exists parent_ticket_enquiries_anon_insert on public.parent_ticket_enquiries;

-- Belt-and-braces: make sure RLS stays ENABLED on both (no-op if already on).
alter table public.visa_enquiries          enable row level security;
alter table public.parent_ticket_enquiries enable row level security;

-- ============================================================================
-- Done. Public form submissions still work (they go through the service-role
-- API routes); direct anon-key writes to these tables are now rejected.
-- ============================================================================
