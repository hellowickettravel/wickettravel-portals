-- ============================================================================
-- Wicket — Fix notification deep-links (Migration 0010)
--
-- Two fixes for the notifications bell:
--   1) message / assignment notifications now deep-link to the specific
--      conversation (…/messages?c=<conversation_id>) so clicking opens that
--      chat instead of just the inbox list.
--   2) a backfill normalises any EXISTING notification rows whose `link` no
--      longer points at a real route, so old rows can never 404.
--
-- Order + status_change links already point at /admin/orders/<id> (a real
-- route) and are left unchanged.
--
-- Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Re-create the message trigger with a per-conversation deep link.
-- ----------------------------------------------------------------------------
create or replace function public.tg_notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_preview text;
begin
  if NEW.direction <> 'incoming' then
    return NEW;
  end if;
  v_preview := left(coalesce(NEW.body, ''), 80);

  for r in
    select employee_id from public.assignments where conversation_id = NEW.conversation_id
  loop
    perform public.create_notification(
      r.employee_id, 'new_message', 'New message', v_preview,
      '/employee/messages?c=' || NEW.conversation_id
    );
  end loop;

  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id, 'new_message', 'New message', v_preview,
      '/admin/messages?c=' || NEW.conversation_id
    );
  end loop;

  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) Re-create the assignment trigger with a per-conversation deep link.
-- ----------------------------------------------------------------------------
create or replace function public.tg_notify_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_notification(
    NEW.employee_id, 'assignment',
    'Conversation assigned to you',
    'You have a new conversation to handle.',
    '/employee/messages?c=' || NEW.conversation_id
  );
  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) Backfill — repair any existing rows whose link could 404.
--    (Existing message/assignment rows have no stored conversation id, so they
--     route to the correct inbox LIST for the recipient's portal — never a 404.)
-- ----------------------------------------------------------------------------
update public.notifications n
set link = case
             when p.role = 'admin' then '/admin/messages'
             else '/employee/messages'
           end
from public.profiles p
where p.id = n.recipient_id
  and n.type in ('new_message', 'assignment')
  and (n.link is null or n.link !~ '^/(admin|employee)/messages');

-- Any order/status notification missing a valid order path → orders list.
update public.notifications
set link = '/admin/orders'
where type in ('new_order', 'status_change')
  and (link is null or link !~ '^/admin/orders');

-- ============================================================================
-- End of migration 0010
-- ============================================================================
