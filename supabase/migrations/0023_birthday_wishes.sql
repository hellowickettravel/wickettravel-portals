-- 0023 — birthday wishes.
--
-- The admin portal emails customers on their birthday. Birthdays already live
-- on customers.date_of_birth (0022); this adds the message the admin writes and
-- a log of every wish sent. Additive only, and the app degrades if it has not
-- been applied yet: the Birthdays screen still lists birthdays, and asks for
-- this migration before it will send.

-- ---------------------------------------------------------- the message
-- Null means "use the built-in default", so an untouched install still sends
-- something sensible.
alter table public.business_settings
  add column if not exists birthday_subject text,
  add column if not exists birthday_message text;

-- ------------------------------------------------------------ the log
create table if not exists public.birthday_emails (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  -- Snapshot of where it went, so history stays readable after an email change.
  email text not null,
  customer_name text,
  -- The birthday this wish belongs to. With the unique index below it is what
  -- makes a second "Happy birthday" in the same year impossible.
  birthday_year int not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

-- One successful wish per customer per birthday. Failed attempts are kept for
-- the history but do not block a retry. Enforced here, not just in the app, so
-- two admins pressing Send at the same moment still produce one email.
create unique index if not exists birthday_emails_one_per_year
  on public.birthday_emails (customer_id, birthday_year)
  where status = 'sent';

create index if not exists birthday_emails_sent_at_idx
  on public.birthday_emails (sent_at desc);

alter table public.birthday_emails enable row level security;

drop policy if exists birthday_emails_admin_all on public.birthday_emails;
create policy birthday_emails_admin_all on public.birthday_emails
  for all
  using (public.is_admin())
  with check (public.is_admin());
