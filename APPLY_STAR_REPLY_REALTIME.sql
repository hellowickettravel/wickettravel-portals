-- ============================================================================
-- APPLY_STAR_REPLY_REALTIME.sql
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run) BEFORE deploying this batch. It is fully
--   idempotent — safe to run again.
--
-- This is the exact contents of migration 0019. It powers three UI updates:
--   • Notifications page  — the "Starred" filter (notifications.is_starred)
--   • Chat reply-to       — quoting a message (messages/order_messages.reply_to_id)
--   • Parents Tickets live — realtime for parent_ticket_enquiries
--
-- NOTE: the app reads these new columns, so apply this FIRST. Until it runs, the
-- notifications bell and chat threads that select the new columns will error.
-- ============================================================================

-- 1) Star notifications
alter table public.notifications
  add column if not exists is_starred boolean not null default false;

-- 2) Reply threading (self-referencing, quoted preview resolved client-side)
alter table public.messages
  add column if not exists reply_to_id uuid
  references public.messages(id) on delete set null;

alter table public.order_messages
  add column if not exists reply_to_id uuid
  references public.order_messages(id) on delete set null;

-- 3) Realtime for the Parents Tickets lead board
alter table public.parent_ticket_enquiries replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'parent_ticket_enquiries'
  ) then
    alter publication supabase_realtime add table public.parent_ticket_enquiries;
  end if;
end $$;
