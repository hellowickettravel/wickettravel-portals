-- ============================================================================
-- Wicket — Admin final pass: notifications + per-user preferences
-- Migration 0009
--
-- Adds a real notifications system (fan-out: one row per recipient, so unread
-- state is per-user and RLS is a simple recipient_id = auth.uid()) plus a
-- per-user preference table that gates which notifications get created.
--
-- Notifications are written by SECURITY DEFINER triggers on messages / orders /
-- assignments, so they fire no matter which code path caused the event
-- (customer service-role insert, employee/admin RLS insert, dev tools, etc.).
--
-- Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,            -- new_message | new_order | assignment | status_change
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id, is_read, created_at desc);

alter table public.notifications enable row level security;

-- A user only ever sees / updates their own notifications.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
-- (No client INSERT policy — only the SECURITY DEFINER triggers write rows.)

-- ----------------------------------------------------------------------------
-- 2) PER-USER NOTIFICATION PREFERENCES
-- ----------------------------------------------------------------------------
create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_message boolean not null default true,
  new_order boolean not null default true,
  status_change boolean not null default true,
  daily_summary boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_rw_own on public.notification_prefs;
create policy notification_prefs_rw_own on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3) HELPER — create one notification, honouring the recipient's prefs
-- ----------------------------------------------------------------------------
create or replace function public.create_notification(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := true;
  v_prefs public.notification_prefs%rowtype;
begin
  if p_recipient is null then
    return;
  end if;

  select * into v_prefs from public.notification_prefs where user_id = p_recipient;
  if found then
    if p_type = 'new_message' then
      v_enabled := v_prefs.new_message;
    elsif p_type = 'new_order' then
      v_enabled := v_prefs.new_order;
    elsif p_type = 'status_change' then
      v_enabled := v_prefs.status_change;
    else
      v_enabled := true; -- 'assignment' is always delivered
    end if;
  end if;

  if not v_enabled then
    return;
  end if;

  insert into public.notifications(recipient_id, type, title, body, link)
  values (p_recipient, p_type, p_title, p_body, p_link);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) TRIGGERS
-- ----------------------------------------------------------------------------

-- New INBOUND message → assigned employees + all admins.
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
      r.employee_id, 'new_message', 'New message', v_preview, '/employee/messages'
    );
  end loop;

  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id, 'new_message', 'New message', v_preview, '/admin/messages'
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.tg_notify_message();

-- New order → all admins.
create or replace function public.tg_notify_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_body text;
begin
  v_body := coalesce(NEW.route_from, '?') || ' → ' || coalesce(NEW.route_to, '?');
  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id, 'new_order', 'New order', v_body, '/admin/orders/' || NEW.id
    );
  end loop;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_order on public.orders;
create trigger trg_notify_order
  after insert on public.orders
  for each row execute function public.tg_notify_order();

-- Conversation assigned → that employee.
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
    '/employee/messages'
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_assignment on public.assignments;
create trigger trg_notify_assignment
  after insert on public.assignments
  for each row execute function public.tg_notify_assignment();

-- Order status changed → all admins.
create or replace function public.tg_notify_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if NEW.status is distinct from OLD.status then
    for r in select id from public.profiles where role = 'admin' loop
      perform public.create_notification(
        r.id, 'status_change', 'Order status changed',
        'Order #' || left(NEW.id::text, 8) || ' is now ' || NEW.status,
        '/admin/orders/' || NEW.id
      );
    end loop;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_status on public.orders;
create trigger trg_notify_status
  after update on public.orders
  for each row execute function public.tg_notify_status();

-- ----------------------------------------------------------------------------
-- 5) REALTIME — push new notifications live (RLS still applies per recipient).
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- End of migration 0009
-- ============================================================================
