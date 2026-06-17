-- ============================================================================
-- Wicket — Schema reconcile for RLS + customer portal
-- Migration 0003  (RUN THIS BEFORE 0002_rls_policies.sql)
--
-- Adds the pieces RLS and the customer portal need, without touching existing
-- data. All statements are idempotent (IF NOT EXISTS / DROP NOT NULL is a no-op
-- when already nullable), so it's safe to run once.
-- ============================================================================

-- customers: link a portal account to a customer record. Nullable — WhatsApp-
-- created customers won't have one; portal-signup customers will.
alter table public.customers
  add column if not exists profile_id uuid references auth.users(id) on delete set null;

create index if not exists customers_profile_id_idx
  on public.customers(profile_id);

-- Portal signups may not have a WhatsApp number yet — allow wa_phone to be null.
alter table public.customers
  alter column wa_phone drop not null;

-- profiles: deactivation flag for the admin "Deactivate employee" action.
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- profiles: store email so the admin employee list can show it (backfilled via
-- signup / admin-create).
alter table public.profiles
  add column if not exists email text;

-- ============================================================================
-- End of migration 0003
-- ============================================================================
