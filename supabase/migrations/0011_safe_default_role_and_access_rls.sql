-- ============================================================================
-- Wicket — Batch E1: critical security fixes (Migration 0011)
--
-- HOLE 1 (privilege escalation): the handle_new_user trigger defaulted new
--   profiles to role 'employee', so ANY OAuth/Google sign-in became an employee.
--   Fix: default new auto-created profiles to the LEAST-privileged role
--   'customer'. Employees are only ever created by the admin createEmployee
--   server action, which sets role='employee' explicitly AFTER creation, so this
--   change does not affect admin-created employees. Email signup still becomes a
--   customer via /api/signup-profile.
--
-- HOLE 2 (access-level bypass): messages_insert_employee / orders_insert_employee
--   / orders_update_employee had NO access_level check, so a view_only employee
--   could insert messages and a chat_only/view_only employee could insert/update
--   orders by calling supabase-js directly (bypassing the UI + server actions).
--   Fix: a SECURITY DEFINER helper exposes the caller's access_level to RLS, and
--   the three employee write policies now enforce the access matrix.
--
-- Idempotent: CREATE OR REPLACE + drop-policy-if-exists. Safe to run once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HOLE 1 — Safe default role for auto-created profiles.
--
-- Replaces ONLY the function body; the existing trigger on auth.users keeps its
-- binding (no trigger is dropped/recreated, so there's no risk of duplicates).
-- NULL/least-privilege access_level: customers don't use it, and a NULL value is
-- treated as no-write by the HOLE 2 policies below (least privilege).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, access_level, full_name, email)
  values (
    new.id,
    'customer',                                   -- least-privileged default
    'view_only',                                  -- harmless for customers
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- HOLE 2 — Expose the caller's access_level to RLS.
-- SECURITY DEFINER so it can read profiles without recursing through RLS.
-- Returns NULL for non-employees / missing rows → those callers fail the
-- equality checks below (fine: admins use the separate *_admin_all policies,
-- customers use their own policies).
-- ----------------------------------------------------------------------------
create or replace function public.employee_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select access_level from public.profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- MESSAGES — view_only employees may NOT send. (full + chat_only may.)
-- Keeps the original checks; adds the access-level gate.
-- ----------------------------------------------------------------------------
drop policy if exists messages_insert_employee on public.messages;
create policy messages_insert_employee on public.messages
  for insert to authenticated
  with check (
    public.is_assigned_to_conversation(conversation_id)
    and direction = 'outgoing'
    and sender_id = auth.uid()
    and public.employee_access_level() <> 'view_only'
  );

-- ----------------------------------------------------------------------------
-- ORDERS (insert) — only FULL employees may create orders.
-- ----------------------------------------------------------------------------
drop policy if exists orders_insert_employee on public.orders;
create policy orders_insert_employee on public.orders
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and conversation_id is not null
    and public.is_assigned_to_conversation(conversation_id)
    and public.employee_access_level() = 'full'
  );

-- ----------------------------------------------------------------------------
-- ORDERS (update) — only FULL employees may edit their own orders.
-- Gate added to BOTH using + with check so view_only/chat_only can't even target
-- a row, nor leave one in a state they own.
-- ----------------------------------------------------------------------------
drop policy if exists orders_update_employee on public.orders;
create policy orders_update_employee on public.orders
  for update to authenticated
  using (
    created_by = auth.uid()
    and public.employee_access_level() = 'full'
  )
  with check (
    created_by = auth.uid()
    and public.employee_access_level() = 'full'
  );

-- ============================================================================
-- End of migration 0011
--
-- NOTE: admins are unaffected — orders_admin_all / messages_admin_all (FOR ALL,
-- using is_admin()) are OR'd with these policies and still grant everything.
-- Customer policies are untouched.
-- ============================================================================
