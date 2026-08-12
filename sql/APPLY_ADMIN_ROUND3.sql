-- ============================================================================
-- APPLY_ADMIN_ROUND3.sql — order hand-off, ticket replies, inbox read receipts
--                          and personal profile pictures
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). Fully idempotent — safe to run again.
--
-- Prerequisites: the base schema. Nothing here depends on the Parents Tickets
-- files, and nothing here alters an existing column's meaning.
--
-- ----------------------------------------------------------------------------
-- EVERY FEATURE IN THIS FILE ALREADY SHIPS IN THE APP AND DEGRADES WITHOUT IT.
--   Until this runs, the code detects each missing column/table and hides the
--   control rather than throwing: "Mark as delivered" does not render, the
--   inbox falls back to counting messages awaiting a reply, ticket threads read
--   as "no replies yet", and the profile-picture upload reports honestly that
--   it is not enabled. Applying this file turns them all on; nothing else has
--   to be deployed.
--
-- WHAT AND WHY
--
--   1) orders.delivered_at
--      An order had exactly two interesting moments — placed, and completed —
--      and completion was always somebody remembering to press a button. There
--      was no way to record "the tickets are issued and the customer now has
--      them", which is the moment the customer's own clock should start. This
--      column is that moment. The app closes an order 24 hours after it unless
--      the customer approves sooner, and it sweeps lazily on read because this
--      project has no pg_cron and no worker — a scheduled job here would be a
--      job that never runs.
--
--   2) support_messages
--      Support was write-only: someone typed a problem, an admin read it and
--      flipped a switch. There was no reply anywhere in the product — not a
--      button, not a table — so every answer left the portal by email and the
--      ticket never recorded what was said. This is the thread.
--
--   3) conversation_reads
--      The staff inbox badge counts customer messages that have arrived since
--      the team last REPLIED. That is a business fact, not a read state, so an
--      admin could not say "I have seen this" without answering it, and the
--      badge kept counting threads already handled elsewhere.
--      `assignments.last_read_at` solves this for employees — but an admin
--      holds no assignment row, so it cannot be reused. One row per (user,
--      conversation) is the smallest honest fix.
--
--   4) profiles.avatar_url
--      There was one image in the whole product: `business_settings.logo_url`,
--      the company mark in the sidebar. A person had no picture at all, so the
--      two kept getting conflated. These are different things and they stay
--      unconnected: this column is one person's face and appears only where
--      that person appears (their account button, their inbox rows, their chat
--      bubbles). It must never drive the sidebar, and the sidebar must never
--      drive it.
-- ============================================================================


-- ============================================================================
-- 1) ORDER DELIVERY / APPROVAL WINDOW
-- ============================================================================
alter table public.orders
  add column if not exists delivered_at timestamptz;

comment on column public.orders.delivered_at is
  'When staff handed the booking to the customer. Starts the 24-hour window '
  'after which the order completes itself unless the customer approves first. '
  'Null = not yet delivered.';

-- The sweep filters on (delivered_at, status); an index keeps it cheap even
-- though it runs on every order-screen render.
create index if not exists orders_delivered_at_idx
  on public.orders (delivered_at)
  where delivered_at is not null;


-- ============================================================================
-- 2) PROFILE PICTURES
-- ============================================================================
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'This person''s own profile picture (public branding bucket, avatar/<uid>/…). '
  'Used ONLY for their avatar: account button, inbox rows, chat bubbles. '
  'Deliberately unrelated to business_settings.logo_url, which is the company '
  'mark in the sidebar.';

-- profiles has a BEFORE-UPDATE column guard (0004/0011/0017) that restores
-- privileged columns a non-admin tries to change. avatar_url is NOT one of
-- those — it is self-service by design, like full_name — so no guard change is
-- needed. RLS profiles_update_own already scopes the write to the caller's row.


-- ============================================================================
-- 3) SUPPORT TICKET REPLIES
-- ============================================================================
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
    references public.support_tickets(id) on delete cascade,

  -- Nullable so deleting a member of staff keeps the history readable rather
  -- than deleting the answer they gave, exactly as messages.sender_id does.
  author_id uuid references public.profiles(id) on delete set null,

  -- Stamped by the guard trigger below from the author's own profile. A client
  -- cannot claim to be staff.
  author_role text not null check (author_role in ('admin', 'employee', 'customer')),

  -- Denormalised so a reply still names its author after that account is gone.
  author_name text,

  body text not null,

  created_at timestamptz not null default now()
);

alter table public.support_messages
  drop constraint if exists support_messages_body_check;
alter table public.support_messages
  add constraint support_messages_body_check
  check (char_length(btrim(body)) between 1 and 4000);

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at);

grant select, insert on public.support_messages to authenticated;
grant all on public.support_messages to service_role;

alter table public.support_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Who may read a reply: whoever may read the ticket.
-- Stated as a subquery against support_tickets rather than re-deriving the
-- rule, so the two can never drift apart.
-- ---------------------------------------------------------------------------
drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and (t.employee_id = auth.uid() or t.customer_id = auth.uid())
    )
  );

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_tickets t
        where t.id = support_messages.ticket_id
          and (t.employee_id = auth.uid() or t.customer_id = auth.uid())
      )
    )
  );

-- No UPDATE and no DELETE policy, for anybody, deliberately. A ticket thread
-- that settles "what did we agree" is worth nothing if it can be rewritten
-- afterwards — the same rule the match threads follow.

-- ---------------------------------------------------------------------------
-- The author is whoever is calling. SECURITY INVOKER on purpose: inside a
-- DEFINER function `current_user` is the OWNER, which is the trap documented
-- in the Parents Tickets files. This only needs auth.uid(), which is a request
-- setting and works fine as invoker.
-- ---------------------------------------------------------------------------
create or replace function public.tg_support_message_author()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  new.author_id := auth.uid();

  select p.role, p.full_name into v_role, v_name
  from public.profiles p
  where p.id = auth.uid();

  -- A helper has no support form of their own (support_tickets is gated to
  -- employees and customers), so anything unexpected is filed as 'customer'
  -- rather than being allowed to claim staff.
  new.author_role := case
    when v_role = 'admin' then 'admin'
    when v_role = 'employee' then 'employee'
    else 'customer'
  end;
  new.author_name := coalesce(nullif(btrim(coalesce(new.author_name, '')), ''), v_name);

  return new;
end;
$$;

drop trigger if exists support_messages_author on public.support_messages;
create trigger support_messages_author
  before insert on public.support_messages
  for each row execute function public.tg_support_message_author();


-- ============================================================================
-- 4) INBOX READ RECEIPTS
-- ============================================================================
create table if not exists public.conversation_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create index if not exists conversation_reads_user_idx
  on public.conversation_reads (user_id);

grant select, insert, update on public.conversation_reads to authenticated;
grant all on public.conversation_reads to service_role;

alter table public.conversation_reads enable row level security;

-- A read receipt is only ever your own. No admin override: knowing whether
-- another member of staff has opened a thread is surveillance, not a feature.
drop policy if exists conversation_reads_rw_own on public.conversation_reads;
create policy conversation_reads_rw_own on public.conversation_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 5) REALTIME
--    support_messages joins the publication so a reply lands on an open
--    ticket without a refresh. conversation_reads deliberately does NOT:
--    it is per-person state that only its owner ever reads, and streaming it
--    would be traffic nobody consumes.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'support_messages'
     )
  then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;


-- ============================================================================
-- VERIFY — expect four rows back
-- ============================================================================
select 'orders.delivered_at' as item,
       count(*)::text as present
  from information_schema.columns
 where table_schema = 'public' and table_name = 'orders'
   and column_name = 'delivered_at'
union all
select 'profiles.avatar_url',
       count(*)::text
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name = 'avatar_url'
union all
select 'support_messages',
       count(*)::text
  from information_schema.tables
 where table_schema = 'public' and table_name = 'support_messages'
union all
select 'conversation_reads',
       count(*)::text
  from information_schema.tables
 where table_schema = 'public' and table_name = 'conversation_reads';
