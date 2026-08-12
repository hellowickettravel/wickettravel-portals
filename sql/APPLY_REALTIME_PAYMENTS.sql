-- ============================================================================
-- APPLY_REALTIME_PAYMENTS.sql — put parent_ticket_payments on the wire
-- ----------------------------------------------------------------------------
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- WHY
-- ---
-- APPLY_PARENTS_FULLSCOPE_0.sql added `parent_ticket_listings`,
-- `parent_ticket_matches` and `parent_ticket_identities` to the
-- `supabase_realtime` publication — but not `parent_ticket_payments`, which
-- was created in the same file. It has never been on the wire.
--
-- That was invisible until the customer and helper portals started
-- subscribing. Supabase Realtime validates a channel's whole table list on
-- join, and one table missing from the publication fails the ENTIRE channel:
--
--   {"status":"error","message":"Unable to subscribe to changes with given
--    parameters. Please check Realtime is enabled for the given connect
--    parameters: [event: *, schema: public, table: parent_ticket_payments…]"}
--
-- So this one omission silently killed live updates for the three tables that
-- WERE configured correctly. `LiveRefresh` now opens one channel per table so
-- a gap like this can never take a screen down again — but the payments
-- ledger still needs this to go live at all.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'parent_ticket_payments'
    ) then
      alter publication supabase_realtime add table public.parent_ticket_payments;
    end if;
  end if;
end
$$;

-- REPLICA IDENTITY FULL so an UPDATE carries the old row too. Without it the
-- payload's `old` is just the primary key, and a client cannot tell what
-- actually changed.
alter table public.parent_ticket_payments replica identity full;

-- ============================================================================
-- Verify (expect one row):
--
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime'
--      and tablename = 'parent_ticket_payments';
-- ============================================================================
