-- ============================================================================
-- APPLY_PARENTS_LEAD_BRIDGE.sql — connect the public lead form to the marketplace
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the whole file, Run). Fully idempotent — safe to run again.
--
-- Prerequisites: APPLY_PARENTS_TICKETS.sql, APPLY_PARENTS_PUBLIC.sql and
-- APPLY_PARENTS_FULLSCOPE_0.sql (all already applied on this project).
--
-- ----------------------------------------------------------------------------
-- THE PROBLEM THIS FIXES
--   Two Parents Tickets funnels existed side by side and never touched:
--
--     • the public homepage form → parent_ticket_enquiries → an admin phones
--       the person. A dead end: nothing turns that lead into a listing.
--     • the marketplace → a customer signs up, verifies, posts a listing.
--       Nobody can find it, because nothing points at it.
--
--   So every lead the business already pays to generate stops at a phone call,
--   and the marketplace only ever fills up with people told the URL by hand.
--
-- WHAT THIS ADDS
--   Two columns on parent_ticket_enquiries, both nullable, both defaulting to
--   nothing — so applying this changes no behaviour on its own:
--
--     converted_listing_id — the marketplace listing this lead became, once an
--                            admin has brought it across. Null for every
--                            existing row, and for any lead never converted.
--     invited_at           — when an admin sent this person a sign-up invite.
--                            Stamped so the queue shows who has been chased.
--
-- WHAT IT DOES NOT DO
--   • No behaviour change to the public intake, the masked public board, or
--     any RLS policy. This is two columns and an index.
--   • It does NOT auto-create accounts. A listing needs a verified identity,
--     so a lead can only become a listing once that person holds an account —
--     the admin screen invites them, or attaches the lead to the account they
--     already have.
-- ============================================================================


-- ============================================================================
-- 1) COLUMNS
-- ============================================================================
alter table public.parent_ticket_enquiries
  add column if not exists converted_listing_id uuid;

alter table public.parent_ticket_enquiries
  add column if not exists invited_at timestamptz;

-- The FK is added separately so re-running is safe even if the column existed
-- before the constraint did.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_ticket_enquiries_converted_listing_fkey'
  ) then
    alter table public.parent_ticket_enquiries
      add constraint parent_ticket_enquiries_converted_listing_fkey
      foreign key (converted_listing_id)
      references public.parent_ticket_listings(id)
      -- A withdrawn listing being deleted must not take the lead with it: the
      -- lead is a record of a real enquiry regardless of what became of it.
      on delete set null;
  end if;
end
$$;

comment on column public.parent_ticket_enquiries.converted_listing_id is
  'The marketplace listing this lead became, once an admin brought it across. Null means the lead is still just a lead.';
comment on column public.parent_ticket_enquiries.invited_at is
  'When an admin sent this person a sign-up invite, so the queue shows who has already been chased.';


-- ============================================================================
-- 2) INDEXES — the two queries the admin queue actually runs
-- ============================================================================
-- "Which leads have NOT been brought across yet?" — a partial index, because
-- that is the only side of the question anyone asks.
create index if not exists parent_ticket_enquiries_unconverted_idx
  on public.parent_ticket_enquiries (created_at desc)
  where converted_listing_id is null;

create index if not exists parent_ticket_enquiries_converted_idx
  on public.parent_ticket_enquiries (converted_listing_id)
  where converted_listing_id is not null;


-- ============================================================================
-- 3) VERIFY — every row should read PRESENT.
-- ============================================================================
select 'column: ' || c as item,
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public'
           and table_name = 'parent_ticket_enquiries'
           and column_name = c
       ) then 'PRESENT' else 'MISSING' end as state
from unnest(array['converted_listing_id', 'invited_at']) as c
union all
select 'fk: converted_listing',
       case when exists (
         select 1 from pg_constraint
         where conname = 'parent_ticket_enquiries_converted_listing_fkey'
       ) then 'PRESENT' else 'MISSING' end
order by 1;


-- ============================================================================
-- Done. The admin's Parent tickets detail screen gains a "Bring into the
-- marketplace" card; nothing else changes.
-- ============================================================================
