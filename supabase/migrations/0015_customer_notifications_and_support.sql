-- ============================================================================
-- Wicket — Customer Batch C2: customer notifications loop + customer support
-- Migration 0015
--
-- 1) CUSTOMER NOTIFICATIONS — make the customer bell real. New rows are written
--    for the OWNING customer (customers.profile_id) by SECURITY DEFINER triggers,
--    so they fire no matter which staff code path caused the event:
--      * staff sets / changes selling_price on the customer's order → "quote ready"
--      * staff changes the order status (open/closed/cancelled)      → "status update"
--      * staff replies (outgoing message) in the customer's chat      → "team replied"
--    Recipient is always the customer's own profile id, so RLS
--    (notifications_select_own from 0009) keeps each customer to their own rows.
--    No admin/employee internal notification ever targets a customer — the staff
--    fan-out (0012) only ever selects role='admin' or assigned employees.
--    Types reuse new_order / status_change / new_message so the existing
--    create_notification preference gating applies to customers too (item 3).
--
-- 2) SUPPORT TICKETS — customers can now raise tickets too. employee_id becomes
--    nullable; customer_id + submitter_role are added; RLS lets a customer
--    insert/read their own; admins still read all; the insert notification names
--    the right submitter (employee OR customer).
--
-- Idempotent: CREATE OR REPLACE + add-column-if-not-exists + drop-if-exists.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a) MESSAGE trigger — add an OUTBOUND branch that notifies the owning customer
--     ("the team replied"). The inbound branch (admins + assigned employee) is
--     unchanged, so staff notifications keep working exactly as before.
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
  v_customer_profile uuid;
begin
  v_preview := left(coalesce(NEW.body, ''), 80);

  if NEW.direction = 'incoming' then
    -- Customer → business: notify ADMINS + the conversation's assigned employee.
    v_actor_id := auth.uid(); -- the customer (null if via service role / webhook)
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

  elsif NEW.direction = 'outgoing' then
    -- Business → customer: notify the OWNING customer only ("Wicket team replied").
    select cu.profile_id into v_customer_profile
      from public.conversations c
      join public.customers cu on cu.id = c.customer_id
      where c.id = NEW.conversation_id;

    if v_customer_profile is not null then
      perform public.create_notification(
        v_customer_profile, 'new_message', 'replied to your message',
        v_preview, '/customer/messages', null, 'Wicket team'
      );
    end if;
  end if;

  return NEW;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1b) CUSTOMER ORDER trigger — quote/price added + status change → owning customer.
--     Separate from the staff status trigger (tg_notify_status) so staff
--     notifications are untouched. Fires on INSERT (staff-created order that
--     already carries a price = an instant quote) and on UPDATE.
-- ----------------------------------------------------------------------------
create or replace function public.tg_notify_customer_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_profile uuid;
  v_route text;
  v_status_label text;
begin
  -- Who owns this order? (null for WhatsApp-only leads → nothing to deliver.)
  if NEW.customer_id is null then
    return NEW;
  end if;
  select profile_id into v_customer_profile
    from public.customers where id = NEW.customer_id;
  if v_customer_profile is null then
    return NEW;
  end if;

  v_route := coalesce(NEW.route_from, '?') || ' → ' || coalesce(NEW.route_to, '?');

  -- Quote ready: price set on insert, or changed to a non-null value on update.
  if NEW.selling_price is not null
     and (TG_OP = 'INSERT' or NEW.selling_price is distinct from OLD.selling_price)
  then
    perform public.create_notification(
      v_customer_profile, 'new_order', 'added a quote to your order',
      v_route || ' · £' || trim(to_char(NEW.selling_price, 'FM999999990.00')),
      '/customer/orders', null, 'Wicket team'
    );
  end if;

  -- Status change (update only): confirmed/closed/cancelled/reopened.
  if TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    v_status_label := case NEW.status
                        when 'closed' then 'completed'
                        when 'cancelled' then 'cancelled'
                        when 'open' then 'back in progress'
                        else NEW.status end;
    perform public.create_notification(
      v_customer_profile, 'status_change', 'updated your order status',
      v_route || ' is now ' || v_status_label,
      '/customer/orders', null, 'Wicket team'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_customer_order on public.orders;
create trigger trg_notify_customer_order
  after insert or update on public.orders
  for each row execute function public.tg_notify_customer_order();

-- ----------------------------------------------------------------------------
-- 1c) REALTIME — make sure orders stream live for the customer My Orders /
--     Dashboard subscriptions (notifications + messages were added in 0009/0005).
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- 2) SUPPORT TICKETS — allow customer-submitted tickets alongside employee ones
-- ============================================================================

-- 2a) Schema: employee_id nullable; add customer_id + submitter_role.
alter table public.support_tickets
  alter column employee_id drop not null;
alter table public.support_tickets
  add column if not exists customer_id uuid references public.profiles(id) on delete cascade;
alter table public.support_tickets
  add column if not exists submitter_role text not null default 'employee';

-- Exactly one submitter is set, matching submitter_role.
alter table public.support_tickets
  drop constraint if exists support_tickets_submitter_chk;
alter table public.support_tickets
  add constraint support_tickets_submitter_chk check (
    (submitter_role = 'employee' and employee_id is not null and customer_id is null) or
    (submitter_role = 'customer' and customer_id is not null and employee_id is null)
  );

create index if not exists support_tickets_customer_idx
  on public.support_tickets(customer_id, created_at desc);

-- 2b) RLS: customers raise + read their own tickets. (Employee + admin policies
--     from 0012 are untouched.)
drop policy if exists support_tickets_insert_customer on public.support_tickets;
create policy support_tickets_insert_customer on public.support_tickets
  for insert to authenticated
  with check (submitter_role = 'customer' and customer_id = auth.uid());

drop policy if exists support_tickets_select_customer on public.support_tickets;
create policy support_tickets_select_customer on public.support_tickets
  for select to authenticated
  using (customer_id = auth.uid());

-- 2c) Insert notification — name the right submitter (employee OR customer) and
--     always target every admin.
create or replace function public.tg_notify_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_actor_id uuid;
  v_actor_name text;
  v_title text;
begin
  if NEW.submitter_role = 'customer' then
    v_actor_id := NEW.customer_id;
    select full_name into v_actor_name from public.profiles where id = NEW.customer_id;
    v_actor_name := coalesce(v_actor_name, 'A customer');
    v_title := 'raised a customer support query';
  else
    v_actor_id := NEW.employee_id;
    select full_name into v_actor_name from public.profiles where id = NEW.employee_id;
    v_actor_name := coalesce(v_actor_name, 'An employee');
    v_title := 'raised a support ticket';
  end if;

  for r in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      r.id, 'support_ticket', v_title, NEW.subject,
      '/admin/support', v_actor_id, v_actor_name
    );
  end loop;

  return NEW;
end;
$$;

-- (Trigger trg_notify_support_ticket from 0012 still bound via CREATE OR REPLACE.)

-- ============================================================================
-- End of migration 0015
-- ============================================================================
