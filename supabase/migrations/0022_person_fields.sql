-- 0022 — the person fields the design's "Add employee" and "Add customer"
-- modals collect. Same contract as 0021: every column is nullable and
-- additive, and the app degrades to the pre-0022 payload if this has not been
-- applied yet, so the deploy is safe in either order.

-- --------------------------------------------------------------- profiles
-- The design's Add employee form asks for a contact number, when they start
-- and what commission band they are on. None of these are permissions —
-- access_level stays the only thing RLS reads.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists start_date date,
  add column if not exists commission_rate text;

comment on column public.profiles.phone is
  'Contact number for the employee. Not used for auth.';
comment on column public.profiles.start_date is
  'First day of employment, as entered on the Add employee form.';
comment on column public.profiles.commission_rate is
  'Commission band label, e.g. "Standard - 8%". Free text: the bands are a
   business rule, not a computed rate.';

-- -------------------------------------------------------------- customers
-- The design's Add customer form collects what a ticketing agent actually
-- needs to issue against a passport, plus who owns the relationship.
alter table public.customers
  add column if not exists preferred_name text,
  add column if not exists nationality text,
  add column if not exists date_of_birth date,
  add column if not exists address text,
  add column if not exists internal_note text,
  add column if not exists assigned_consultant_id uuid references public.profiles(id) on delete set null;

comment on column public.customers.preferred_name is
  'What to call them in conversation, when it differs from the passport name.';
comment on column public.customers.date_of_birth is
  'Needed at ticketing; stored as a date so it is never ambiguous.';
comment on column public.customers.internal_note is
  'Staff-only note. Never shown in the customer portal.';
comment on column public.customers.assigned_consultant_id is
  'The employee who owns the relationship. Order assignment stays per order.';

create index if not exists customers_assigned_consultant_idx
  on public.customers (assigned_consultant_id);
