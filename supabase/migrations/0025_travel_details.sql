-- 0025 — Travel details: the admin's directory of everyone the business has
-- booked travel for.
--
-- A customer account is one person. An order often carries several — a
-- customer books for a spouse, their parents, their children — and until now
-- those people only existed as names inside one order's passenger list. This
-- gives each of them a record of their own: contact details, date of birth,
-- passport, who they book through, and every trip they have been on.
--
-- Additive only, and nothing existing reads these tables: the Travel details
-- screen detects their absence and asks for this migration, so the deploy is
-- safe in either order. Admin-only throughout — employees and customers have
-- no policy here, so they can neither read nor write a row.

-- ------------------------------------------------------------ travellers
create table if not exists public.travellers (
  id uuid primary key default gen_random_uuid(),
  -- As printed on the passport. The only required field.
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  preferred_name text,
  email text,
  phone text,
  date_of_birth date,
  nationality text,
  passport_number text,
  passport_expiry date,
  address text,
  -- Staff-only. Never shown outside the admin portal.
  notes text,
  -- Set when this traveller IS the person behind a customer account. At most
  -- one traveller per customer (index below).
  customer_id uuid references public.customers(id) on delete set null,
  -- The customer account who books for them — a companion's lead booker.
  booked_by_customer_id uuid references public.customers(id) on delete set null,
  -- How they relate to that booker: "Spouse or partner", "Parent", ...
  relationship text,
  -- True when the person has asked not to receive marketing email. Birthday
  -- wishes skip them.
  marketing_opt_out boolean not null default false,
  -- Where the record came from: typed in by the admin, created from a
  -- customer account, or picked up from an order's passenger list.
  source text not null default 'manual'
    check (source in ('manual', 'customer', 'order')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists travellers_one_per_customer
  on public.travellers (customer_id)
  where customer_id is not null;
create index if not exists travellers_booked_by_idx
  on public.travellers (booked_by_customer_id);
create index if not exists travellers_email_idx
  on public.travellers (lower(email));
create index if not exists travellers_name_idx
  on public.travellers (lower(full_name));

comment on table public.travellers is
  'Admin directory of every person the business has booked travel for (Travel details screen).';

-- --------------------------------------------------------- traveller_trips
-- Which orders a traveller was on. The IBE (booking-engine reference) lives
-- here, not on the traveller: it belongs to one trip, not to the person.
create table if not exists public.traveller_trips (
  traveller_id uuid not null references public.travellers(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  -- lead = the account holder, travelling; companion = travelling with them;
  -- booker = the account holder who booked but is not on the passenger list.
  role text not null default 'companion'
    check (role in ('lead', 'companion', 'booker')),
  ibe text,
  created_at timestamptz not null default now(),
  primary key (traveller_id, order_id)
);

create index if not exists traveller_trips_order_idx
  on public.traveller_trips (order_id);

-- ------------------------------------------------------- traveller_imports
-- What has already been read into the directory. Once an order or a customer
-- is recorded here it is never imported again — so a traveller the admin
-- deletes stays deleted instead of reappearing on the next visit.
create table if not exists public.traveller_imports (
  source_type text not null check (source_type in ('order', 'customer')),
  source_id uuid not null,
  imported_at timestamptz not null default now(),
  primary key (source_type, source_id)
);

-- What is still to import. security_invoker so the caller's own RLS applies:
-- only an admin sees rows, exactly as if they had queried the tables.
create or replace view public.traveller_pending_orders
  with (security_invoker = true) as
  select o.id, o.created_at
  from public.orders o
  where not exists (
    select 1 from public.traveller_imports i
    where i.source_type = 'order' and i.source_id = o.id
  );

create or replace view public.traveller_pending_customers
  with (security_invoker = true) as
  select c.id, c.created_at
  from public.customers c
  where not exists (
    select 1 from public.traveller_imports i
    where i.source_type = 'customer' and i.source_id = c.id
  );

-- ---------------------------------------------- traveller_birthday_emails
-- Birthday wishes to travellers who have no customer account. (Account
-- holders are wished from the Birthdays screen and logged in birthday_emails;
-- this is a separate log so that screen is untouched.)
create table if not exists public.traveller_birthday_emails (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid references public.travellers(id) on delete cascade,
  email text not null,
  traveller_name text,
  birthday_year int not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

-- One successful wish per traveller per birthday, enforced by the database so
-- two admins pressing Send together still produce one email.
create unique index if not exists traveller_birthday_emails_one_per_year
  on public.traveller_birthday_emails (traveller_id, birthday_year)
  where status = 'sent';

-- -------------------------------------------------------------------- RLS
alter table public.travellers enable row level security;
alter table public.traveller_trips enable row level security;
alter table public.traveller_imports enable row level security;
alter table public.traveller_birthday_emails enable row level security;

drop policy if exists travellers_admin_all on public.travellers;
create policy travellers_admin_all on public.travellers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists traveller_trips_admin_all on public.traveller_trips;
create policy traveller_trips_admin_all on public.traveller_trips
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists traveller_imports_admin_all on public.traveller_imports;
create policy traveller_imports_admin_all on public.traveller_imports
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists traveller_birthday_emails_admin_all on public.traveller_birthday_emails;
create policy traveller_birthday_emails_admin_all on public.traveller_birthday_emails
  for all using (public.is_admin()) with check (public.is_admin());
