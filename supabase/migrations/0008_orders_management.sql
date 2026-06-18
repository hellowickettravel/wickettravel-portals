-- ============================================================================
-- Wicket — Admin Batch A: full order management
-- Migration 0008
--
-- Adds the two columns the admin order-management features need:
--   * closed_at            — stamped when an order is closed, cleared on
--                            reopen/cancel; lets analytics time closed orders
--                            accurately (commission-this-month, etc.)
--   * assigned_employee_id — the employee an admin attributes the order to
--                            (separate from created_by, which is the author)
--
-- Idempotent (IF NOT EXISTS), safe to run more than once. No RLS change needed:
-- admin writes go through the existing orders_admin_all policy.
-- ============================================================================

alter table public.orders
  add column if not exists closed_at timestamptz;

alter table public.orders
  add column if not exists assigned_employee_id uuid
    references public.profiles(id) on delete set null;

create index if not exists orders_assigned_employee_id_idx
  on public.orders(assigned_employee_id);

-- Backfill closed_at for orders already marked closed so historical figures
-- aren't blank (uses created_at as the best available timestamp).
update public.orders
   set closed_at = created_at
 where status = 'closed' and closed_at is null;

-- ============================================================================
-- End of migration 0008
-- ============================================================================
