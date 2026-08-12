-- ============================================================================
-- APPLY_HELPER_SUPPORT.sql — let helper accounts raise a support ticket
-- ----------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- WHY
-- ---
-- `support_tickets` was built for employees (0012) and then opened to
-- customers (0015). The `helper` role arrived later, and nothing let it in:
--   * the CHECK constraint allows only submitter_role IN ('employee','customer')
--   * the INSERT policy only passes rows whose submitter_role = 'customer'
-- So `/helper/support` has been an honest contact card rather than the ticket
-- form every other role gets. A service provider who is owed money needs a
-- tracked channel with a reply thread, not an email address.
--
-- WHAT THIS DOES *NOT* DO
-- -----------------------
-- It does NOT add a `helper_id` column. `customer_id` is a `profiles(id)`
-- reference, not a `customers(id)` one — it has always been "the non-staff
-- submitter", and a helper has no `customers` row by design. Adding a third
-- submitter column would mean touching the admin queue's embed, the reply
-- routing and the notification trigger to gain nothing but a better column
-- name. `submitter_role` remains the thing that says who this is.
-- ============================================================================

begin;

-- 1) Allow 'helper' as a third submitter, still with exactly one id set.
alter table public.support_tickets
  drop constraint if exists support_tickets_submitter_chk;
alter table public.support_tickets
  add constraint support_tickets_submitter_chk check (
    (submitter_role = 'employee' and employee_id is not null and customer_id is null) or
    (submitter_role = 'customer' and customer_id is not null and employee_id is null) or
    (submitter_role = 'helper'   and customer_id is not null and employee_id is null)
  );

-- 2) INSERT for helpers.
--    Kept as its own policy rather than widening the customer one, so that
--    revoking helper access later is a single DROP POLICY and cannot
--    accidentally take customers with it.
--
--    The role check reads `profiles` directly rather than trusting the
--    submitted `submitter_role`: without it, any authenticated user could post
--    a row claiming to be a helper. `auth.uid()` pins the row to the caller.
drop policy if exists support_tickets_insert_helper on public.support_tickets;
create policy support_tickets_insert_helper on public.support_tickets
  for insert to authenticated
  with check (
    submitter_role = 'helper'
    and customer_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'helper'
    )
  );

-- 3) SELECT needs nothing: support_tickets_select_customer is
--    `using (customer_id = auth.uid())`, which already returns a helper their
--    own rows. Listed here so the next reader does not go looking for it.
--    The same is true of support_messages_insert, whose check already passes
--    `t.customer_id = auth.uid()`.

-- 4) Reply authorship.
--    APPLY_ADMIN_ROUND3.sql wrote the author trigger when helpers had no
--    support form at all, so it files anything that isn't staff as 'customer'.
--    That was the safe default then; now it would label a helper's own reply
--    "Customer" in their own thread.
alter table public.support_messages
  drop constraint if exists support_messages_author_role_check;
alter table public.support_messages
  add constraint support_messages_author_role_check
  check (author_role in ('admin', 'employee', 'customer', 'helper'));

create or replace function public.tg_support_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  -- Never trust a submitted author: it is always the caller.
  new.author_id := auth.uid();

  select p.role, p.full_name into v_role, v_name
  from public.profiles p
  where p.id = auth.uid();

  -- Anything unexpected still falls back to 'customer' rather than being
  -- allowed to claim staff.
  new.author_role := case
    when v_role = 'admin' then 'admin'
    when v_role = 'employee' then 'employee'
    when v_role = 'helper' then 'helper'
    else 'customer'
  end;
  new.author_name := coalesce(nullif(btrim(coalesce(new.author_name, '')), ''), v_name);

  return new;
end;
$$;

commit;

-- ============================================================================
-- Verify (expect one row for the constraint and one for the new policy):
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint where conname = 'support_tickets_submitter_chk';
--
--   select policyname, cmd from pg_policies
--    where tablename = 'support_tickets' and policyname like '%helper%';
-- ============================================================================
