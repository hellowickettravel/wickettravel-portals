-- 0021 — the fields the "Admin Portal All Pages" design shows but the schema
-- had nowhere to store. Every column is nullable and additive, so the app runs
-- unchanged before this migration is applied and simply fills the gaps after.

-- ---------------------------------------------------------------- orders
-- The boarding pass names the carrier and its flight numbers; the Flight
-- details grid shows a per-person budget; the Pricing card ends on a payment
-- line ("Card · paid in full").
alter table public.orders
  add column if not exists airline text,
  add column if not exists flight_numbers text,
  add column if not exists budget_per_person numeric,
  add column if not exists payment_method text,
  add column if not exists payment_status text;

comment on column public.orders.airline is
  'Carrier shown on the boarding pass header, e.g. "Emirates".';
comment on column public.orders.flight_numbers is
  'Free text, e.g. "EK 004 · EK 003" — outbound and return in one field.';
comment on column public.orders.budget_per_person is
  'What the customer said they wanted to spend per traveller.';
comment on column public.orders.payment_method is
  'How the customer paid: card / bank transfer / cash / not paid.';
comment on column public.orders.payment_status is
  'paid_in_full / deposit / unpaid / refunded.';

-- --------------------------------------------------------------- profiles
-- The design's Employees table shows a job title in its Role column; our
-- access_level is a permission tier and stays separate.
alter table public.profiles
  add column if not exists job_title text;

comment on column public.profiles.job_title is
  'Human job title, e.g. "Ticketing agent". Not a permission — see access_level.';

-- ------------------------------------------------------- business_settings
-- The design's Business profile carries the trading identifiers a UK travel
-- agent is asked for, plus the currency every figure is printed in.
alter table public.business_settings
  add column if not exists company_number text,
  add column if not exists atol_licence text,
  add column if not exists iata_number text,
  add column if not exists currency text default 'GBP';

update public.business_settings set currency = 'GBP' where currency is null;
