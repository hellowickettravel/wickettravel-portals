-- ============================================================================
-- APPLY_PARENTS_MESSAGES.sql — let matched parties talk inside the portal
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). Fully idempotent — safe to run again.
--
-- Prerequisites: APPLY_PARENTS_FULLSCOPE_0.sql (applied).
--
-- ----------------------------------------------------------------------------
-- WHY
--   Until now an introduction handed both people an email address and a phone
--   number, and the conversation left the building. That is bad for everyone:
--   the family and the helper lose the record of what was agreed, and Wicket
--   loses sight of an arrangement it brokered and is accountable for. If
--   something goes wrong at an airport, nobody can show what was said.
--
--   So: one thread per match, inside the portal, visible to both parties and
--   to an admin.
--
-- THE GATE — WHY THE THREAD OPENS AT RELEASE, NOT AT ACCEPTANCE
--   It would be friendlier to open the thread the moment both sides accept.
--   It would also let two people arrange the whole trip and swap details in
--   the chat without the payment that release depends on — which is the
--   business model, not a technicality. So the thread uses the SAME gate as
--   contact details: `parent_ticket_matches.contact_released = true`.
--
--   That gate lives in the INSERT policy, not in application code, so it holds
--   for a hostile client exactly as it does for the UI.
--
-- WHAT AN ADMIN CAN DO
--   Read every thread, and post in one. This is a brokered service someone is
--   paid a commission for; when a trip goes wrong the business has to be able
--   to see what was arranged and to step in. Admins cannot edit or delete
--   anyone's message — there is no UPDATE policy for anybody.
-- ============================================================================


-- ============================================================================
-- 1) TABLE
-- ============================================================================
create table if not exists public.parent_ticket_messages (
  id uuid primary key default gen_random_uuid(),

  match_id uuid not null
    references public.parent_ticket_matches(id) on delete cascade,

  -- Who wrote it. An admin stepping in is a real sender, not a system row, so
  -- the thread always shows a person.
  sender_id uuid not null
    references public.profiles(id) on delete cascade,

  body text not null,

  created_at timestamptz not null default now()
);

alter table public.parent_ticket_messages
  drop constraint if exists parent_ticket_messages_body_check;
alter table public.parent_ticket_messages
  add constraint parent_ticket_messages_body_check
  check (length(btrim(body)) between 1 and 4000);

-- The only query path: one thread, oldest first.
create index if not exists parent_ticket_messages_thread_idx
  on public.parent_ticket_messages (match_id, created_at);

comment on table public.parent_ticket_messages is
  'One thread per Parents Tickets match. Readable by both parties and admins; writable only once the match contact has been released.';


-- Supabase's default privileges already grant these, but stating them makes the
-- file self-contained: if a project's default privileges have ever been
-- tightened, the table would otherwise exist and be completely unusable with a
-- "permission denied" that looks nothing like an RLS problem.
grant select, insert on public.parent_ticket_messages to authenticated;
grant all on public.parent_ticket_messages to service_role;


-- ============================================================================
-- 2) GUARD — the sender is always the caller
--    A party could otherwise post as the other person, which on a record used
--    to settle a dispute is the worst possible forgery.
-- ============================================================================
create or replace function public.tg_guard_parent_ticket_message()
returns trigger
language plpgsql
security invoker          -- see APPLY_PARENTS_FULLSCOPE_0.sql §0 for why
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  new.sender_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_parent_ticket_message on public.parent_ticket_messages;
create trigger trg_guard_parent_ticket_message
  before insert on public.parent_ticket_messages
  for each row execute function public.tg_guard_parent_ticket_message();


-- ============================================================================
-- 3) RLS
-- ============================================================================
alter table public.parent_ticket_messages enable row level security;

-- Admin: read everything, and post. Deliberately NOT `for all` — see below.
drop policy if exists parent_ticket_messages_admin_read on public.parent_ticket_messages;
create policy parent_ticket_messages_admin_read on public.parent_ticket_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists parent_ticket_messages_admin_insert on public.parent_ticket_messages;
create policy parent_ticket_messages_admin_insert on public.parent_ticket_messages
  for insert to authenticated
  with check (public.is_admin());

-- A party reads their own match's thread from the moment it exists.
drop policy if exists parent_ticket_messages_party_read on public.parent_ticket_messages;
create policy parent_ticket_messages_party_read on public.parent_ticket_messages
  for select to authenticated
  using (public.is_parent_ticket_party(match_id, auth.uid()));

-- ...but can only WRITE once the introduction has been released. This is the
-- same gate as the contact details themselves, in the database rather than the
-- UI, so skipping the app does not skip the rule.
drop policy if exists parent_ticket_messages_party_insert on public.parent_ticket_messages;
create policy parent_ticket_messages_party_insert on public.parent_ticket_messages
  for insert to authenticated
  with check (
    public.is_parent_ticket_party(match_id, auth.uid())
    and exists (
      select 1 from public.parent_ticket_matches m
      where m.id = match_id and m.contact_released = true
    )
  );

-- NO update policy and NO delete policy, for anyone including admins. A thread
-- that settles "what did we agree" is worth nothing if it can be rewritten
-- afterwards.


-- ============================================================================
-- 4) REALTIME — the thread should land without a refresh, like every other
--    message surface in the product.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'parent_ticket_messages'
     )
  then
    alter publication supabase_realtime add table public.parent_ticket_messages;
  end if;
end
$$;


-- ============================================================================
-- 5) VERIFY — every row should read PRESENT / ON.
-- ============================================================================
select 'table: parent_ticket_messages' as item,
       case when to_regclass('public.parent_ticket_messages') is not null
            then 'PRESENT' else 'MISSING' end as state
union all
select 'rls enabled',
       case when (select relrowsecurity from pg_class
                  where oid = 'public.parent_ticket_messages'::regclass)
            then 'ON' else 'OFF' end
union all
select 'policies (expect 4)',
       (select count(*)::text from pg_policies
        where schemaname = 'public' and tablename = 'parent_ticket_messages')
union all
select 'no update/delete policy',
       case when not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'parent_ticket_messages'
           and cmd in ('UPDATE', 'DELETE')
       ) then 'CONFIRMED' else 'SOMETHING CAN EDIT' end
order by 1;


-- ============================================================================
-- Done. The thread appears on a released match in all three portals.
-- ============================================================================
