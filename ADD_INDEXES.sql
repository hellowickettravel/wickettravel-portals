-- ============================================================================
-- Wicket — Performance indexes for hot query paths
--
-- Run this in the Supabase SQL editor (or via the CLI). FULLY IDEMPOTENT:
-- every statement is `create index if not exists`, so re-running is a no-op and
-- never errors. No data is touched — indexes only.
--
-- These back the queries the portals run most often. Existing indexes already
-- cover: orders.order_number (unique), orders.assigned_employee_id,
-- order_messages.order_id, order_attachments.order_id / .message_id,
-- customers.profile_id, notifications.recipient, support_tickets.customer /
-- .employee, and the auth_attempts lookups. Everything below fills the gaps on
-- the remaining hot paths (foreign-key filters, status filters, chat reads and
-- "newest first" ordering) so those queries use an index seek instead of a
-- sequential scan as the tables grow.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- ORDERS
--   getOrdersForEmployee / analytics leaderboard  → filter on created_by
--   getOrdersForCustomer / admin customer detail  → filter on customer_id
--   order lookups tied to a conversation          → filter on conversation_id
--   transactions + admin status tabs              → filter on status
--   every order list ("newest first")             → order by created_at desc
-- ----------------------------------------------------------------------------
create index if not exists orders_created_by_idx
  on public.orders (created_by);

create index if not exists orders_customer_id_idx
  on public.orders (customer_id);

create index if not exists orders_conversation_id_idx
  on public.orders (conversation_id);

create index if not exists orders_status_idx
  on public.orders (status);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);


-- ----------------------------------------------------------------------------
-- MESSAGES  (conversation chat + inbox previews / unread counts)
--   getMessages(conversationId)                 → filter conversation_id, order by created_at
--   inbox preview + unread (in(convIds), desc)  → same composite
-- A composite (conversation_id, created_at desc) serves both the per-thread read
-- and the "latest message per conversation" preview scan.
-- ----------------------------------------------------------------------------
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);


-- ----------------------------------------------------------------------------
-- ASSIGNMENTS  (employee inbox scoping)
--   getInboxForEmployee / getAssignmentsForEmployee     → filter employee_id
--   getConversationsOverview / getAssignmentsForConv     → filter conversation_id
-- ----------------------------------------------------------------------------
create index if not exists assignments_employee_id_idx
  on public.assignments (employee_id);

create index if not exists assignments_conversation_id_idx
  on public.assignments (conversation_id);


-- ----------------------------------------------------------------------------
-- CONVERSATIONS
--   customer's own conversations   → filter customer_id
--   inbox lists ("newest activity first")  → order by last_message_at desc
-- ----------------------------------------------------------------------------
create index if not exists conversations_customer_id_idx
  on public.conversations (customer_id);

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);
