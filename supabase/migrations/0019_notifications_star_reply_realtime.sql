-- ============================================================================
-- Wicket — Migration 0019
-- Three small, additive changes. Fully idempotent — safe to run more than once.
--
--   1) notifications.is_starred        — lets a user "star" a notification so the
--                                        dedicated Notifications page can filter
--                                        by Starred. RLS from 0009 already scopes
--                                        every read/update to recipient_id =
--                                        auth.uid(), so no new policy is needed.
--
--   2) messages.reply_to_id            — WhatsApp-style "reply to a message". A
--      order_messages.reply_to_id        self-referencing FK; the quoted preview
--                                        is resolved from the loaded thread, so no
--                                        embed/join is required at read time.
--
--   3) realtime for parent_ticket_enquiries — so the admin Parents Tickets list
--      updates live the moment a new lead is submitted (no manual refresh).
-- ============================================================================

-- 1) Star notifications ------------------------------------------------------
alter table public.notifications
  add column if not exists is_starred boolean not null default false;

-- 2) Reply threading ---------------------------------------------------------
alter table public.messages
  add column if not exists reply_to_id uuid
  references public.messages(id) on delete set null;

alter table public.order_messages
  add column if not exists reply_to_id uuid
  references public.order_messages(id) on delete set null;

-- 3) Realtime for the Parents Tickets lead board -----------------------------
-- Full row images on UPDATE/DELETE so realtime payloads carry all columns.
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
