-- ============================================================================
-- APPLY_PARENTS_PUBLIC.sql — public display flags for Parents Tickets leads
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). It is fully idempotent — safe to run again.
--
-- Prerequisite: APPLY_PARENTS_TICKETS.sql must already have been applied.
--
-- What this adds:
--   A small opt-in publishing path so approved leads can be listed on the
--   public homepage board. Two booleans, both default FALSE:
--
--     consent_public — the SUBMITTER ticked "you may show this publicly" on the
--                      form. Set once at intake; admins never flip it on
--                      someone's behalf.
--     is_public      — an ADMIN approved this entry for display. Nothing is
--                      ever public until this is switched on by hand.
--
--   A row is publicly listable only when BOTH are true. That rule is enforced
--   in three places: the DB check constraint below, the admin server action,
--   and the public read endpoint's query — so no single mistake exposes a row.
--
-- What this does NOT change:
--   RLS stays exactly as it was — ADMIN ONLY, no anon policy. The public read
--   endpoint (/api/parent-ticket/public) uses the service-role client and
--   hand-picks a short list of non-identifying columns; it never selects
--   full_name, email, phone, parent_name, notes or admin_notes. Contact
--   details therefore remain unreachable from outside the admin portal.
-- ============================================================================


-- ============================================================================
-- 1) COLUMNS — both default false, so applying this publishes nothing
-- ============================================================================
alter table public.parent_ticket_enquiries
  add column if not exists consent_public boolean not null default false;

alter table public.parent_ticket_enquiries
  add column if not exists is_public boolean not null default false;

comment on column public.parent_ticket_enquiries.consent_public is
  'Submitter agreed on the public form that their (masked) entry may be shown on the website. Captured at intake.';
comment on column public.parent_ticket_enquiries.is_public is
  'Admin approved this entry for public display. Requires consent_public = true.';


-- ============================================================================
-- 2) INTEGRITY — an entry can never be public without consent
-- ============================================================================
-- Defence in depth: even a buggy update or a direct service-role write cannot
-- publish an entry whose submitter did not opt in.
alter table public.parent_ticket_enquiries
  drop constraint if exists parent_ticket_enquiries_public_consent_check;
alter table public.parent_ticket_enquiries
  add constraint parent_ticket_enquiries_public_consent_check
  check (is_public = false or consent_public = true);


-- ============================================================================
-- 3) INDEX — the public endpoint's only query path
--    Partial index: covers exactly the published rows, ordered newest-first.
-- ============================================================================
create index if not exists parent_ticket_enquiries_public_idx
  on public.parent_ticket_enquiries (created_at desc)
  where is_public = true;


-- ============================================================================
-- Done. Reload the portal — the "Show on website" toggle appears on each lead
-- and /api/parent-ticket/public starts serving approved entries.
-- ============================================================================
