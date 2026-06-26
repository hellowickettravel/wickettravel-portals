-- ============================================================================
-- Wicket — Batch A: notification targeting + actor labels, support tickets
-- Migration 0012
--
-- 1) NOTIFICATIONS
--    * adds actor_id + actor_name (who performed the action) so the bell can
--      render "You …" (actor_id = auth.uid()) vs "Real Name …".
--    * create_notification gains actor params (back-compatible: defaults null).
--    * triggers recompute the recipient set PER EVENT so notifications never leak
--      across roles:
--        - new customer message  → ADMINS + that conversation's ASSIGNED employee
--        - new order             → ADMINS + assigned employee (conversation/order)
--        - order status change   → ADMINS + assigned employee
--        - conversation assigned → the assigned employee only
--      Customers are never in any recipient set, and RLS (notifications_select_own
--      from 0009) still limits every reader to recipient_id = auth.uid().
--    * titles are now ACTION phrases ("sent a new message", "closed an order")
--      so the client can prefix the actor label.
--
-- 2) SUPPORT TICKETS — employee-raised internal issues + admin queue, RLS-scoped,
--    with an admin-targeted notification on insert.
--
-- Idempotent: CREATE OR REPLACE + drop-if-exists. Safe to run once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a) Actor columns
-- ----------------------------------------------------------------------------
alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.notifications
  add column if not exists actor_name text;

-- ----------------------------------------------------------------------------
-- 1b) create_notification — now carries the actor. Old 5-arg signature dropped
--     and replaced with a 7-arg version whose actor args default to NULL, so any
--     caller passing 5 args still resolves.
-- ----------------------------------------------------------------------------
drop function if exists public.create_notification(uuid, text, text, text, text);
create or replace function public.create_notification(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text,
  p_actor_id uuid default null,
  p_actor_name text default null
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

  -- Honour the recipient's preferences for the gated types.
  select * into v_prefs from public.notification_prefs where user_id = p_recipient;
  if found then
    if p_type = 'new_message' then
      v_enabled := v_prefs.new_message;
    elsif p_type = 'new_order' then
      v_enabled := v_prefs.new_order;
    elsif p_type = 'status_change' then
      v_enabled := v_prefs.status_change;
    else
      v_enabled := true; -- assignment / support_ticket always delivered
    end if;
  end if;

  if not v_enabled then
    return;
  end if;

  insert into public.notifications(recipient_id, type, title, body, link, actor_id, actor_name)
  values (p_recipient, p_type, p_title, p_body, p_link, p_actor_id, p_actor_name);
end;
$$;

-- ----------------------------------------------------------------------------
-- 1c) MESSAGE trigger — only INBOUND (customer) messages notify, and only the
--     ADMINS + the conversation's ASSIGNED employee(s). Actor = the customer.
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
  v_actor_id uuid;
  v_actor_name text;
  v_link text;
begin
  if NEW.direction <> 'incoming' then
    return NEW;
  end if;

  v_preview := left(coalesce(NEW.body, ''), 80);
  v_actor_id := auth.uid(); -- the customer (null if sent via the service role)
  select cu.name into v_actor_name
    from public.conversations c
    join public.customers cu on cu.id = c.customer_id
    where c.id = NEW.conversation_id;
  v_actor_name := coalesce(v_actor_name, 'A customer');

  for r in
    select p.id, p.role from public.profiles p where p.role = 'admin'
    union
    select p.id, p.role from public.profiles p
      join public.assignments a on a.employee_id = p.id
     where a.conversation_id = NEW.conversation_id
  loop
    v_link := case when r.role = 'admin'
                then '/admin/messages?c=' || NEW.conversation_id
                else '/employee/messages?c=' || NEW.conversation_id end;
    perform public.create_notification(
      r.id, 'new_message', 'sent a new message', v_preview, v_link, v_actor_id, v_actor_name
    );
  end loop;

  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1d) ORDER (insert) trigger — ADMINS + assigned employee. Actor = staff creator,
--     or the customer for customer-placed quote requests (created_by null).
-- ----------------------------------------------------------------------------
create or replace function public.tg_notify_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_body text;
  v_actor_id uuid;
  v_actor_name text;
  v_link text;
begin
  v_body := coalesce(NEW.route_from, '?') || ' → ' || coalesce(NEW.route_to, '?');
  v_actor_id := auth.uid();
  select full_name into v_actor_name from public.profiles where id = v_actor_id;
  if v_actor_name is null then
    select cu.name into v_actor_name from public.customers cu where cu.id = NEW.customer_id;
    v_actor_name := coalesce(v_actor_name, 'A customer');
  end if;

  for r in
    select p.id, p.role from public.profiles p where p.role = 'admin'
    union
    select p.id, p.role from public.profiles p
      join public.assignments a on a.employee_id = p.id
     where NEW.conversation_id is not null and a.conversation_id = NEW.conversation_id
    union
    select p.id, p.role from public.profiles p
     where NEW.assigned_employee_id is not null and p.id = NEW.assigned_employee_id
  loop
    v_link := case when r.role = 'admin'
                then '/admin/orders/' || NEW.id
                else '/employee/orders' end;
    perform public.create_notification(
      r.id, 'new_order', 'placed a new order', v_body, v_link, v_actor_id, v_actor_name
    );
  end loop;

  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1e) ORDER (status change) trigger — ADMINS + assigned employee. Actor = whoever
--     changed it (admins close/cancel/reopen via their own session).
-- ----------------------------------------------------------------------------
create or replace function public.tg_notify_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_actor_id uuid;
  v_actor_name text;
  v_action text;
  v_body text;
  v_link text;
begin
  if NEW.status is distinct from OLD.status then
    v_actor_id := auth.uid();
    select full_name into v_actor_name from public.profiles where id = v_actor_id;
    v_actor_name := coalesce(v_actor_name, 'Someone');

    v_action := case NEW.status
                  when 'closed' then 'closed an order'
                  when 'cancelled' then 'cancelled an order'
                  when 'open' then 'reopened an order'
                  else 'updated an order' end;
    v_body := 'Order #' || left(NEW.id::text, 8) || ' · ' ||
              coalesce(NEW.route_from, '?') || ' → ' || coalesce(NEW.route_to, '?');

    for r in
      select p.id, p.role from public.profiles p where p.role = 'admin'
      union
      select p.id, p.role from public.profiles p
        join public.assignments a on a.employee_id = p.id
       where NEW.conversation_id is not null and a.conversation_id = NEW.conversation_id
      union
      select p.id, p.role from public.profiles p
       where NEW.assigned_employee_id is not null and p.id = NEW.assigned_employee_id
    loop
      v_link := case when r.role = 'admin'
                  then '/admin/orders/' || NEW.id
                  else '/employee/orders' end;
      perform public.create_notification(
        r.id, 'status_change', v_action, v_body, v_link, v_actor_id, v_actor_name
      );
    end loop;
  end if;

  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1f) ASSIGNMENT trigger — only the assigned employee. (Self-contained title;
--     the assigning admin acts via service role, so no actor is recorded.)
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
    'New conversation assigned to you',
    'You have a new conversation to handle.',
    '/employee/messages?c=' || NEW.conversation_id,
    null, null
  );
  return NEW;
end;
$$;

-- (Triggers themselves are unchanged from 0009 — CREATE OR REPLACE FUNCTION keeps
--  their existing bindings, so nothing else needs re-wiring.)

-- ----------------------------------------------------------------------------
-- 2) SUPPORT TICKETS
-- ----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open',        -- open | resolved
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_employee_idx
  on public.support_tickets(employee_id, created_at desc);

alter table public.support_tickets enable row level security;

-- Employees: raise + read their own tickets.
drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert to authenticated
  with check (employee_id = auth.uid());

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets
  for select to authenticated
  using (employee_id = auth.uid());

-- Admins: read + update (resolve/reopen) every ticket.
drop policy if exists support_tickets_admin_all on public.support_tickets;
create policy support_tickets_admin_all on public.support_tickets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Notify every admin when a new ticket is raised. Actor = the employee.
create or replace function public.tg_notify_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_actor_name text;
begin
  select full_name into v_actor_name from public.profiles where id = NEW.employee_id;
  v_actor_name := coalesce(v_actor_name, 'An employee');

  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id, 'support_ticket', 'raised a support ticket', NEW.subject,
      '/admin/support', NEW.employee_id, v_actor_name
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_support_ticket on public.support_tickets;
create trigger trg_notify_support_ticket
  after insert on public.support_tickets
  for each row execute function public.tg_notify_support_ticket();

-- Realtime for the admin support queue.
do $$
begin
  begin
    alter publication supabase_realtime add table public.support_tickets;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- End of migration 0012
-- ============================================================================
