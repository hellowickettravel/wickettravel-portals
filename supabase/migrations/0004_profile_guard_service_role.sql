-- ============================================================================
-- Wicket — Fix: profile update guard blocks the service-role admin client
-- Migration 0004
--
-- PROBLEM (introduced in 0002):
--   trg_profile_update_guard fires BEFORE UPDATE on public.profiles for EVERY
--   caller, including the service-role admin client used by the admin server
--   actions (createEmployee / updateEmployee / setEmployeeActive). Under the
--   service role, auth.uid() is NULL so public.is_admin() returns false, and any
--   change to role / access_level / is_active makes the trigger RAISE — so admin
--   edit / change-access / deactivate were all rejected at the DB layer.
--
-- FIX:
--   The guard should only restrict NON-privileged callers. Allow the update to
--   pass through when the caller is the service role (auth.uid() is null /
--   auth.role() = 'service_role') or a signed-in admin. The trigger itself is
--   unchanged — only the function body is replaced.
--
-- Safe to run more than once (CREATE OR REPLACE).
-- ============================================================================

create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Privileged callers bypass the column guard entirely:
  --   * service-role (admin server actions): no auth.uid(), role = 'service_role'
  --   * signed-in admins
  if auth.uid() is null
     or auth.role() = 'service_role'
     or public.is_admin() then
    return new;
  end if;

  -- Non-privileged callers (an employee editing their own row) may not change
  -- privileged fields.
  if new.role is distinct from old.role
     or new.access_level is distinct from old.access_level
     or coalesce(new.is_active, true) is distinct from coalesce(old.is_active, true) then
    raise exception 'Not allowed to modify privileged profile fields';
  end if;

  return new;
end;
$$;

-- Trigger definition is unchanged; recreated here only so this file is
-- self-contained and idempotent.
drop trigger if exists trg_profile_update_guard on public.profiles;
create trigger trg_profile_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_update_guard();
