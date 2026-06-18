-- ============================================================================
-- Wicket — Allow customer- and admin-created orders
-- Migration 0007
--
-- PROBLEM:
--   Customer "Book a Flight" quote requests are inserted with created_by = NULL
--   (a customer is not staff). If orders.created_by is NOT NULL, that insert
--   fails at the DB layer — which is why Book-a-Flight silently errored. The
--   same applies to conversation_id / customer_id for orders not tied to a chat.
--
-- FIX:
--   Make these columns nullable. Each statement is a NO-OP if the column is
--   already nullable, so this migration is safe to run more than once.
--
-- NOTE: customer-created orders are inserted by a server action using the
--   SERVICE-ROLE client (after verifying the session user owns the customer
--   row), and admin-created orders go through orders_admin_all — so NO new RLS
--   insert policy is required.
-- ============================================================================

alter table public.orders alter column created_by      drop not null;
alter table public.orders alter column conversation_id drop not null;
alter table public.orders alter column customer_id     drop not null;

-- ============================================================================
-- End of migration 0007
-- ============================================================================
