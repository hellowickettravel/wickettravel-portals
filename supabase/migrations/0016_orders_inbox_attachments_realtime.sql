-- ============================================================================
-- Wicket — Foundation: orders upgrade, per-order inbox, attachments, realtime
-- Migration 0016
--
-- Context: the WhatsApp/mock-messaging plan is CANCELLED. Messaging is now
-- internal Supabase Realtime between admin / employee / customer (all three log
-- in). This migration lays the data foundation for the order workflow + the
-- per-order dedicated inbox. UI is built in later chunks.
--
-- WHAT THIS DOES
--   1) ORDERS — human order number (#1234567), a 4-state status
--      (new / in_progress / completed / cancelled), flight-detail fields for the
--      create-order form, and a pre-order customer note.
--   2) ORDER_MESSAGES — a per-order inbox table. Each row carries the sender's
--      role (admin / employee / customer) so the UI can show fixed labels. The
--      customer is LOCKED OUT (server-side, via RLS) once the order is
--      completed/cancelled.
--   3) ORDER_ATTACHMENTS — reference rows for files/images on order messages and
--      on the pre-order note, backed by a private "order-attachments" bucket.
--   4) REALTIME — order_messages + order_attachments added to the publication.
--   5) RLS — admin sees all; employee sees assigned orders; customer sees own.
--
-- Idempotent: drop-if-exists + IF NOT EXISTS + CREATE OR REPLACE throughout.
-- Apply AFTER 0002–0015. The service-role key bypasses RLS, so server actions
-- that use it keep working; all policies below target `authenticated` only.
-- ============================================================================

-- ============================================================================
-- 1) ORDERS — status vocabulary migration + new columns
-- ============================================================================

-- 1a) Status: open|closed|cancelled  ->  new|in_progress|completed|cancelled.
--     Drop any existing CHECK touching status (name may vary), remap legacy
--     rows, set the new default + constraint. closed_at stays the completion
--     timestamp (set when an order becomes 'completed').
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
      and rel.relname = 'orders'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end $$;

update public.orders set status = 'new'       where status = 'open';
update public.orders set status = 'completed' where status = 'closed';

alter table public.orders alter column status set default 'new';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'in_progress', 'completed', 'cancelled'));

-- 1b) Flight-detail + pre-order columns for the create-order form (Chunk 1).
alter table public.orders
  add column if not exists order_number     text,
  add column if not exists trip_type        text,
  add column if not exists adults           integer not null default 1,
  add column if not exists children         integer not null default 0,
  add column if not exists child_ages       integer[] not null default '{}',
  add column if not exists wheelchair       boolean not null default false,
  add column if not exists extra_luggage    boolean not null default false,
  add column if not exists extra_luggage_kg integer,
  add column if not exists cabin_class      text,
  add column if not exists passenger_names  text[] not null default '{}',
  add column if not exists customer_note    text;

alter table public.orders drop constraint if exists orders_trip_type_check;
alter table public.orders
  add constraint orders_trip_type_check
  check (trip_type is null or trip_type in ('direct', 'connection'));

alter table public.orders drop constraint if exists orders_cabin_class_check;
alter table public.orders
  add constraint orders_cabin_class_check
  check (cabin_class is null or cabin_class in ('economy', 'premium_economy', 'business', 'first'));

-- 1c) Human order number: '#' + 7 digits (e.g. #7343490), unique.
--     A trigger fills it on insert; we retry on the (tiny) chance of a collision.
create or replace function public.gen_order_number()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
  attempts  int := 0;
begin
  loop
    -- floor(random()*9000000) -> 0..8999999, +1000000 -> 1000000..9999999 (always 7 digits)
    candidate := '#' || lpad(((floor(random() * 9000000) + 1000000)::int)::text, 7, '0');
    exit when not exists (select 1 from public.orders where order_number = candidate);
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not generate a unique order number after % attempts', attempts;
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.tg_set_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.gen_order_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_order_number on public.orders;
create trigger trg_set_order_number
  before insert on public.orders
  for each row execute function public.tg_set_order_number();

-- Backfill existing orders ONE ROW AT A TIME so each generated number sees the
-- prior in-transaction assignments (collision-safe), then enforce uniqueness.
do $$
declare
  r record;
begin
  for r in select id from public.orders where order_number is null or order_number = '' loop
    update public.orders set order_number = public.gen_order_number() where id = r.id;
  end loop;
end $$;

create unique index if not exists orders_order_number_key on public.orders(order_number);

-- 1d) Keep the customer status-notification trigger (0015) aligned with the new
--     status vocabulary (it previously matched open/closed).
create or replace function public.tg_notify_customer_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_profile uuid;
  v_route text;
  v_status_label text;
begin
  if new.customer_id is null then
    return new;
  end if;
  select profile_id into v_customer_profile
    from public.customers where id = new.customer_id;
  if v_customer_profile is null then
    return new;
  end if;

  v_route := coalesce(new.route_from, '?') || ' → ' || coalesce(new.route_to, '?');

  -- Quote ready: price set on insert, or changed to a non-null value on update.
  if new.selling_price is not null
     and (TG_OP = 'INSERT' or new.selling_price is distinct from old.selling_price)
  then
    perform public.create_notification(
      v_customer_profile, 'new_order', 'added a quote to your order',
      v_route || ' · £' || trim(to_char(new.selling_price, 'FM999999990.00')),
      '/customer/orders', null, 'Wicket team'
    );
  end if;

  -- Status change (update only).
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    v_status_label := case new.status
                        when 'new'         then 'received'
                        when 'in_progress' then 'in progress'
                        when 'completed'   then 'completed'
                        when 'cancelled'   then 'cancelled'
                        else new.status end;
    perform public.create_notification(
      v_customer_profile, 'status_change', 'updated your order status',
      v_route || ' is now ' || v_status_label,
      '/customer/orders', null, 'Wicket team'
    );
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 2) ACCESS HELPERS for orders (mirror the conversation helpers in 0002/0014).
--    SECURITY DEFINER so they bypass RLS internally (no recursion).
-- ============================================================================

-- Staff member can work this order: its assignee, its author, or assigned to its
-- conversation.
create or replace function public.is_assigned_to_order(ord uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = ord and (
      o.assigned_employee_id = auth.uid()
      or o.created_by = auth.uid()
      or (o.conversation_id is not null and public.is_assigned_to_conversation(o.conversation_id))
    )
  );
$$;

-- Current user is the portal customer who owns this order.
create or replace function public.owns_order(ord uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = ord and c.profile_id = auth.uid()
  );
$$;

-- Any participant of the order: admin, assigned staff, or owning customer.
create or replace function public.can_access_order(ord uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select ord is not null and (
    public.is_admin()
    or public.is_assigned_to_order(ord)
    or public.owns_order(ord)
  );
$$;

-- Order inbox is locked for the CUSTOMER once completed/cancelled.
create or replace function public.order_is_locked(ord uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = ord and o.status in ('completed', 'cancelled')
  );
$$;

-- ============================================================================
-- 3) ORDER_MESSAGES — per-order dedicated inbox
-- ============================================================================
create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('admin', 'employee', 'customer')),
  body        text,
  media_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists order_messages_order_id_idx
  on public.order_messages(order_id, created_at);

alter table public.order_messages enable row level security;

-- Read: any participant of the order.
drop policy if exists order_messages_select_participant on public.order_messages;
create policy order_messages_select_participant on public.order_messages
  for select to authenticated
  using (public.can_access_order(order_id));

-- Admin: full control (can always message, even on a locked order).
drop policy if exists order_messages_admin_all on public.order_messages;
create policy order_messages_admin_all on public.order_messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Employee: send as themselves on an order they're assigned to.
drop policy if exists order_messages_insert_employee on public.order_messages;
create policy order_messages_insert_employee on public.order_messages
  for insert to authenticated
  with check (
    sender_role = 'employee'
    and sender_id = auth.uid()
    and public.is_assigned_to_order(order_id)
  );

-- Customer: send on their own order — BUT NOT once it's completed/cancelled.
drop policy if exists order_messages_insert_customer on public.order_messages;
create policy order_messages_insert_customer on public.order_messages
  for insert to authenticated
  with check (
    sender_role = 'customer'
    and sender_id = auth.uid()
    and public.owns_order(order_id)
    and not public.order_is_locked(order_id)
  );

-- ============================================================================
-- 4) ORDER_ATTACHMENTS — reference rows for files on messages + the pre-order note
-- ============================================================================
create table if not exists public.order_attachments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  message_id    uuid references public.order_messages(id) on delete cascade, -- null = pre-order note attachment
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploader_role text check (uploader_role in ('admin', 'employee', 'customer')),
  storage_path  text not null,        -- key in the private 'order-attachments' bucket
  file_name     text,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

create index if not exists order_attachments_order_id_idx
  on public.order_attachments(order_id, created_at);
create index if not exists order_attachments_message_id_idx
  on public.order_attachments(message_id);

alter table public.order_attachments enable row level security;

drop policy if exists order_attachments_select_participant on public.order_attachments;
create policy order_attachments_select_participant on public.order_attachments
  for select to authenticated
  using (public.can_access_order(order_id));

drop policy if exists order_attachments_admin_all on public.order_attachments;
create policy order_attachments_admin_all on public.order_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Staff may attach anytime on their orders; the customer only while not locked.
drop policy if exists order_attachments_insert_participant on public.order_attachments;
create policy order_attachments_insert_participant on public.order_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_assigned_to_order(order_id)
      or (public.owns_order(order_id) and not public.order_is_locked(order_id))
    )
  );

-- ============================================================================
-- 5) STORAGE — private "order-attachments" bucket, scoped to order participants
--    Path convention: order/<order_id>/<file>  (legacy <order_id>/<file> works too)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('order-attachments', 'order-attachments', false)
on conflict (id) do update set public = false;

create or replace function public.storage_order_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
  candidate text;
  result uuid;
begin
  if object_name is null then
    return null;
  end if;
  parts := string_to_array(object_name, '/');
  if array_length(parts, 1) is null or array_length(parts, 1) < 2 then
    return null;
  end if;
  if parts[1] = 'order' then
    candidate := parts[2];
  else
    candidate := parts[1];
  end if;
  begin
    result := candidate::uuid;
  exception when others then
    return null;
  end;
  return result;
end;
$$;

drop policy if exists order_attachments_storage_read on storage.objects;
create policy order_attachments_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-attachments'
    and public.can_access_order(public.storage_order_id(name))
  );

drop policy if exists order_attachments_storage_insert on storage.objects;
create policy order_attachments_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-attachments'
    and public.can_access_order(public.storage_order_id(name))
  );

drop policy if exists order_attachments_storage_owner_update on storage.objects;
create policy order_attachments_storage_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'order-attachments' and owner = auth.uid())
  with check (bucket_id = 'order-attachments' and owner = auth.uid());

drop policy if exists order_attachments_storage_owner_delete on storage.objects;
create policy order_attachments_storage_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-attachments' and owner = auth.uid());

-- ============================================================================
-- 6) REALTIME — stream the per-order inbox live to every participant.
--    (orders/messages/conversations already added in 0005/0015. RLS still
--    applies to realtime: a client only receives change events for rows it can
--    SELECT.)
-- ============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.order_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.order_attachments;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- End of migration 0016
-- ============================================================================
