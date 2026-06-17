-- ============================================================================
-- Wicket — Role-based RLS policies
-- Migration 0002
--
-- Safe to run more than once: every policy is dropped-if-exists before create,
-- and helper functions use CREATE OR REPLACE.
--
-- SCHEMA (real, after 0003_schema_reconcile.sql adds profile_id/is_active/email):
--   profiles(id = auth.uid(), full_name, role, access_level, created_at, is_active, email)
--   customers(id, profile_id -> auth.uid() for portal customers, wa_phone, name, created_at)
--   conversations(id, customer_id -> customers.id, status, last_message_at, created_at)
--   assignments(id, conversation_id -> conversations.id, employee_id -> profiles.id, created_at)
--   messages(id, conversation_id, direction 'incoming'|'outgoing', body, media_url, sender_id -> profiles.id, created_at)
--   orders(id, conversation_id, customer_id, route_from, route_to, travel_date, return_date,
--          passengers, status 'open'|'closed'|'cancelled', selling_price, cost_price, commission,
--          notes, created_by -> profiles.id, created_at)
--
-- RUN ORDER: apply 0003_schema_reconcile.sql FIRST, then this file.
--
-- NOTE: the service-role key (used by server API routes like /api/signup-profile)
-- BYPASSES RLS entirely, so those keep working regardless of the policies below.
-- All policies target the `authenticated` role only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions. All are SECURITY DEFINER so they bypass RLS internally —
-- this prevents infinite recursion when a table's policy needs to look at
-- another RLS-protected table (e.g. conversations ↔ customers).
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Employee is assigned to this conversation.
create or replace function public.is_assigned_to_conversation(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments a
    where a.conversation_id = conv and a.employee_id = auth.uid()
  );
$$;

-- Current user is the portal owner of this customer record.
create or replace function public.owns_customer(cust uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customers c
    where c.id = cust and c.profile_id = auth.uid()
  );
$$;

-- Current user is the portal owner of the customer on this conversation.
create or replace function public.owns_conversation(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.customers cu on cu.id = c.customer_id
    where c.id = conv and cu.profile_id = auth.uid()
  );
$$;

-- Employee can see this customer because they're assigned to one of its convos.
create or replace function public.employee_sees_customer(cust uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.assignments a on a.conversation_id = c.id
    where c.customer_id = cust and a.employee_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS (idempotent) on every table.
-- ----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.customers     enable row level security;
alter table public.conversations enable row level security;
alter table public.assignments   enable row level security;
alter table public.messages      enable row level security;
alter table public.orders        enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
--   read:   own row, or any row if admin
--   update: own row (limited columns enforced by trigger below), or any if admin
--   insert: handled by the signup DB trigger / service role — no client policy
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Column-level guard: RLS can't restrict columns, so a trigger blocks non-admins
-- from changing privileged fields (role / access_level / is_active). Self-service
-- edits are limited to fields like full_name.
create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.access_level is distinct from old.access_level
     or coalesce(new.is_active, true) is distinct from coalesce(old.is_active, true) then
    raise exception 'Not allowed to modify privileged profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_update_guard on public.profiles;
create trigger trg_profile_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_update_guard();

-- ----------------------------------------------------------------------------
-- CUSTOMERS
--   admins: all
--   employees: customers tied to a conversation assigned to them (read)
--   customers: only their own record (read)
-- ----------------------------------------------------------------------------
drop policy if exists customers_admin_all on public.customers;
create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists customers_select_employee on public.customers;
create policy customers_select_employee on public.customers
  for select to authenticated
  using (public.employee_sees_customer(id));

drop policy if exists customers_select_own on public.customers;
create policy customers_select_own on public.customers
  for select to authenticated
  using (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CONVERSATIONS
--   admins: all; employees: assigned only; customers: own only
-- ----------------------------------------------------------------------------
drop policy if exists conversations_admin_all on public.conversations;
create policy conversations_admin_all on public.conversations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists conversations_select_employee on public.conversations;
create policy conversations_select_employee on public.conversations
  for select to authenticated
  using (public.is_assigned_to_conversation(id));

drop policy if exists conversations_select_customer on public.conversations;
create policy conversations_select_customer on public.conversations
  for select to authenticated
  using (public.owns_conversation(id));

-- ----------------------------------------------------------------------------
-- ASSIGNMENTS
--   admins: all; employees: read their own
-- ----------------------------------------------------------------------------
drop policy if exists assignments_admin_all on public.assignments;
create policy assignments_admin_all on public.assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists assignments_select_own on public.assignments;
create policy assignments_select_own on public.assignments
  for select to authenticated
  using (employee_id = auth.uid());

-- ----------------------------------------------------------------------------
-- MESSAGES
--   admins: all
--   employees: read messages in assigned convos; insert OUTBOUND into them
--   customers: read messages in their own convos
--   (inbound messages are written by the service role, which bypasses RLS)
-- ----------------------------------------------------------------------------
drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all on public.messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists messages_select_employee on public.messages;
create policy messages_select_employee on public.messages
  for select to authenticated
  using (public.is_assigned_to_conversation(conversation_id));

drop policy if exists messages_insert_employee on public.messages;
create policy messages_insert_employee on public.messages
  for insert to authenticated
  with check (
    public.is_assigned_to_conversation(conversation_id)
    and direction = 'outgoing'
    and sender_id = auth.uid()
  );

drop policy if exists messages_select_customer on public.messages;
create policy messages_select_customer on public.messages
  for select to authenticated
  using (public.owns_conversation(conversation_id));

-- ----------------------------------------------------------------------------
-- ORDERS
--   admins: all
--   employees: orders they created OR tied to a conversation assigned to them
--   customers: only their own orders
-- ----------------------------------------------------------------------------
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists orders_select_employee on public.orders;
create policy orders_select_employee on public.orders
  for select to authenticated
  using (
    created_by = auth.uid()
    or (conversation_id is not null and public.is_assigned_to_conversation(conversation_id))
  );

drop policy if exists orders_select_customer on public.orders;
create policy orders_select_customer on public.orders
  for select to authenticated
  using (public.owns_customer(customer_id));

-- ============================================================================
-- End of migration 0002
-- ============================================================================
