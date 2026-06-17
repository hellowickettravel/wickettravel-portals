-- ============================================================================
-- Wicket — Employee inbox: read-tracking, last_message_at trigger,
--                          employee order inserts, realtime publication
-- Migration 0005 (Batch 3c)
--
-- Safe to run more than once. Apply AFTER 0002/0003/0004.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) READ TRACKING (lightweight, no new table)
--    One assignment row already exists per (employee, conversation), so a
--    last_read_at column there is the minimal place to track per-employee reads.
--    Unread = incoming messages with created_at > last_read_at.
-- ----------------------------------------------------------------------------
alter table public.assignments
  add column if not exists last_read_at timestamptz;

-- Employees may UPDATE their own assignment row (to stamp last_read_at).
drop policy if exists assignments_update_own on public.assignments;
create policy assignments_update_own on public.assignments
  for update to authenticated
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2) AUTO-BUMP conversations.last_message_at ON every new message
--    Runs as SECURITY DEFINER so it works regardless of who inserted the
--    message (employee via RLS, or admin/service-role for incoming) and without
--    needing an UPDATE policy on conversations for employees.
-- ----------------------------------------------------------------------------
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_conversation_last_message on public.messages;
create trigger trg_bump_conversation_last_message
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ----------------------------------------------------------------------------
-- 3) ORDERS — let employees INSERT orders they create on conversations they
--    are assigned to. (0002 only had select/admin policies for orders.)
--    Column- / access-level checks (view_only, chat_only) are enforced in the
--    server action; RLS guarantees an employee can only file an order against a
--    conversation that is actually theirs, authored by themselves.
-- ----------------------------------------------------------------------------
drop policy if exists orders_insert_employee on public.orders;
create policy orders_insert_employee on public.orders
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and conversation_id is not null
    and public.is_assigned_to_conversation(conversation_id)
  );

-- Allow employees to UPDATE the orders they created (status changes / edits).
drop policy if exists orders_update_employee on public.orders;
create policy orders_update_employee on public.orders
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- 4) REALTIME — add messages + conversations to the realtime publication so
--    the inbox updates live. RLS still applies to realtime: an employee only
--    receives change events for rows they can SELECT.
--    (Wrapped so re-running doesn't error if already added.)
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- End of migration 0005
-- ============================================================================
