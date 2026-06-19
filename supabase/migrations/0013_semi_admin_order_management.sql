-- ============================================================================
-- Wicket — Batch B: semi_admin access level + employee order management
-- Migration 0013
--
-- Adds a new access level 'semi_admin' = everything 'full' can do PLUS order
-- editing & status management. RLS now enforces:
--   * order INSERT  → full OR semi_admin (both may create)
--   * order UPDATE  → semi_admin only, on orders they can SEE
--                     (created_by them OR tied to a conversation assigned to them)
--   * messages      → unchanged (view_only still blocked; semi_admin <> view_only
--                     so it can send)
--
-- Idempotent. Safe to run once. Requires 0011 (employee_access_level helper).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Allow 'semi_admin' in profiles.access_level.
--    Drop any existing CHECK constraint that references access_level (name may
--    vary), then add the widened one. Null stays allowed (least-privilege rows).
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%access_level%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_access_level_check
  check (
    access_level is null
    or access_level in ('full', 'chat_only', 'view_only', 'semi_admin')
  );

-- ----------------------------------------------------------------------------
-- 2) ORDER INSERT — full OR semi_admin may create orders on their own assigned
--    conversations. (view_only / chat_only still blocked.)
-- ----------------------------------------------------------------------------
drop policy if exists orders_insert_employee on public.orders;
create policy orders_insert_employee on public.orders
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and conversation_id is not null
    and public.is_assigned_to_conversation(conversation_id)
    and public.employee_access_level() in ('full', 'semi_admin')
  );

-- ----------------------------------------------------------------------------
-- 3) ORDER UPDATE — semi_admin ONLY, on orders they can see (created_by them OR
--    tied to a conversation assigned to them). Mirrors orders_select_employee
--    visibility so "edit what you can see" holds, gated to semi_admin.
-- ----------------------------------------------------------------------------
drop policy if exists orders_update_employee on public.orders;
create policy orders_update_employee on public.orders
  for update to authenticated
  using (
    (
      created_by = auth.uid()
      or (conversation_id is not null and public.is_assigned_to_conversation(conversation_id))
    )
    and public.employee_access_level() = 'semi_admin'
  )
  with check (
    (
      created_by = auth.uid()
      or (conversation_id is not null and public.is_assigned_to_conversation(conversation_id))
    )
    and public.employee_access_level() = 'semi_admin'
  );

-- ============================================================================
-- End of migration 0013
--
-- NOTE: admins are unaffected (orders_admin_all, is_admin()). messages_insert_
-- employee from 0011 is unchanged — semi_admin can send (<> 'view_only').
-- ============================================================================
