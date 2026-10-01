-- 0027 — Parent Travel Assist: admin-managed board options.
--
-- The airports, airlines, languages and "help needed" options behind the
-- public board's search and filters on wickettravel.com/parents-tickets.
-- Managed at /admin/parents-options; served (active rows only) by
-- GET /api/parent-ticket/options.
--
-- Additive only: one new table, seeded with the lists the website shipped
-- with, so the admin starts from what visitors already see. Running it twice
-- is harmless (`if not exists`, `on conflict do nothing`).
--
-- Until this has been run, the website keeps using its built-in lists and
-- the admin screen says to run this file.

create table if not exists public.parent_assist_options (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('airport', 'airline', 'language', 'support')),
  value       text not null check (char_length(value) between 1 and 80),
  label       text check (label is null or char_length(label) <= 80),
  region      text check (region is null or region in ('uk', 'destination')),
  sort_order  integer not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, value)
);

comment on table public.parent_assist_options is
  'Parent Travel Assist board options (airports, airlines, languages, help needed), edited by admins.';

create index if not exists parent_assist_options_kind_idx
  on public.parent_assist_options (kind, is_active, sort_order);

-- Admin-only. The public route reads with the service role and returns only
-- active rows, so nothing here is exposed to anon or customers directly.
alter table public.parent_assist_options enable row level security;

drop policy if exists parent_assist_options_admin_all on public.parent_assist_options;
create policy parent_assist_options_admin_all on public.parent_assist_options
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed: the website's built-in lists as of 2026-10-01.
insert into public.parent_assist_options (kind, value, label, region, sort_order) values
  ('airport', 'LHR', 'London Heathrow', 'uk', 10),
  ('airport', 'LGW', 'London Gatwick', 'uk', 20),
  ('airport', 'MAN', 'Manchester', 'uk', 30),
  ('airport', 'BHX', 'Birmingham', 'uk', 40),
  ('airport', 'STN', 'London Stansted', 'uk', 50),
  ('airport', 'EDI', 'Edinburgh', 'uk', 60),
  ('airport', 'GLA', 'Glasgow', 'uk', 70),
  ('airport', 'LTN', 'London Luton', 'uk', 80),
  ('airport', 'DXB', 'Dubai', 'destination', 10),
  ('airport', 'DEL', 'Delhi', 'destination', 20),
  ('airport', 'BOM', 'Mumbai', 'destination', 30),
  ('airport', 'HYD', 'Hyderabad', 'destination', 40),
  ('airport', 'BLR', 'Bengaluru', 'destination', 50),
  ('airport', 'ISB', 'Islamabad', 'destination', 60),
  ('airport', 'LHE', 'Lahore', 'destination', 70),
  ('airport', 'KHI', 'Karachi', 'destination', 80),
  ('airport', 'AUH', 'Abu Dhabi', 'destination', 90),
  ('airport', 'DOH', 'Doha', 'destination', 100),
  ('airport', 'COK', 'Kochi', 'destination', 110),
  ('airport', 'AMD', 'Ahmedabad', 'destination', 120),
  ('airport', 'ATQ', 'Amritsar', 'destination', 130),
  ('airport', 'DAC', 'Dhaka', 'destination', 140),
  ('airport', 'CMB', 'Colombo', 'destination', 150),
  ('airport', 'JED', 'Jeddah', 'destination', 160),
  ('airline', 'Air India', null, null, 10),
  ('airline', 'British Airways', null, null, 20),
  ('airline', 'Emirates', null, null, 30),
  ('airline', 'Etihad Airways', null, null, 40),
  ('airline', 'Gulf Air', null, null, 50),
  ('airline', 'Kuwait Airways', null, null, 60),
  ('airline', 'Oman Air', null, null, 70),
  ('airline', 'Pakistan International Airlines', null, null, 80),
  ('airline', 'Qatar Airways', null, null, 90),
  ('airline', 'Saudia', null, null, 100),
  ('airline', 'SriLankan Airlines', null, null, 110),
  ('airline', 'Turkish Airlines', null, null, 120),
  ('airline', 'Virgin Atlantic', null, null, 130),
  ('language', 'Arabic', null, null, 10),
  ('language', 'Bengali', null, null, 20),
  ('language', 'English', null, null, 30),
  ('language', 'Gujarati', null, null, 40),
  ('language', 'Hindi', null, null, 50),
  ('language', 'Kannada', null, null, 60),
  ('language', 'Malayalam', null, null, 70),
  ('language', 'Marathi', null, null, 80),
  ('language', 'Pashto', null, null, 90),
  ('language', 'Punjabi', null, null, 100),
  ('language', 'Sinhala', null, null, 110),
  ('language', 'Tamil', null, null, 120),
  ('language', 'Telugu', null, null, 130),
  ('language', 'Urdu', null, null, 140),
  ('support', 'None — just company and reassurance', 'Company only', null, 10),
  ('support', 'Wheelchair assistance', 'Wheelchair help', null, 20),
  ('support', 'Walking aid / slow on their feet', 'Walking aid', null, 30),
  ('support', 'Visual impairment', 'Visual support', null, 40),
  ('support', 'Hearing impairment', 'Hearing support', null, 50),
  ('support', 'Other (described in the notes)', 'Other support', null, 60)
on conflict (kind, value) do nothing;
