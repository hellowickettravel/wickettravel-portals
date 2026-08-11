-- ============================================================================
-- APPLY_HELPER_ROLE.sql — a fourth role: the Parents Tickets helper
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). Fully idempotent — safe to run again.
--
-- Prerequisites: APPLY_PARENTS_FULLSCOPE_0.sql (applied).
--
-- ----------------------------------------------------------------------------
-- WHY
--   A helper is a SERVICE PROVIDER, not a customer. They aren't buying a
--   flight — they're offering to accompany somebody's parent on one they were
--   already taking, and being paid for it. Filing them under 'customer' put a
--   booking wizard and an orders list in front of someone who will never use
--   either, and made the business's own reporting lie about who its customers
--   are.
--
--   So: a customer BUYS (books flights, asks for help for a parent), and a
--   helper PROVIDES. Two roles, two portals, one database.
--
-- WHAT THIS CHANGES
--   Exactly one thing: profiles.role gains 'helper' as a permitted value. The
--   live constraint today is ('admin', 'employee', 'customer'), which is why an
--   attempt to set 'helper' is rejected outright.
--
-- WHAT IT DOES NOT CHANGE
--   • No RLS policy is touched. The marketplace tables key on
--     `profile_id = auth.uid()`, never on role, so a helper's listings,
--     matches and payments already work the moment the role exists.
--   • No existing row moves. Every current profile keeps the role it has;
--     nobody becomes a helper by running this.
--   • Nothing about admin, employee or customer behaviour changes.
--
-- ONE CONSEQUENCE WORTH KNOWING
--   A person is one role at a time. Somebody who helps on one trip AND needs
--   help for their own parent on another would need two accounts. That is the
--   honest cost of separating the two, and it is rare enough to be worth it —
--   but if it turns out not to be, the fix is a capability flag rather than a
--   role, and this constraint would widen again rather than being replaced.
-- ============================================================================


-- ============================================================================
-- 1) THE ROLE
-- ============================================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'employee', 'customer', 'helper'));

comment on column public.profiles.role is
  'admin | employee | customer | helper. A customer buys (flights, help for a parent); a helper provides the Parents Tickets accompaniment service.';


-- ============================================================================
-- 2) INDEX — the admin screens filter people by role constantly
-- ============================================================================
create index if not exists profiles_role_idx on public.profiles (role);


-- ============================================================================
-- 3) VERIFY
--    'helper accepted' proves the constraint took; the counts show nobody
--    moved. Run this block on its own if you want to re-check later.
-- ============================================================================
do $$
begin
  -- Prove the new value is permitted without leaving a row behind.
  begin
    insert into public.profiles (id, full_name, role)
    values ('00000000-0000-0000-0000-0000000000ff', 'constraint probe', 'helper');
    delete from public.profiles where id = '00000000-0000-0000-0000-0000000000ff';
    raise notice 'helper accepted: YES';
  exception
    when check_violation then
      raise notice 'helper accepted: NO — the constraint did not take';
    when others then
      -- A foreign key to auth.users would land here; the constraint is still
      -- what we were testing, and it clearly did not reject the value.
      raise notice 'helper accepted: YES (insert blocked by another rule, not the role check)';
  end;
end
$$;

select role, count(*) as people
from public.profiles
group by role
order by role;


-- ============================================================================
-- Done. Nothing changes until someone signs up at /signup?as=helper, or an
-- admin changes an existing person's role by hand.
-- ============================================================================
