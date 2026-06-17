-- ============================================================================
-- Wicket — Batch 3d: customer messaging, admin inbox, business settings, storage
-- Migration 0006
--
-- Safe to run more than once. Apply AFTER 0002–0005.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) CUSTOMER MESSAGE INSERTS
--    A customer may send a message into THEIR OWN conversation only. From the
--    business's perspective that message is INBOUND, so direction='incoming'
--    and there is no authenticated sender_id.
--    (Admin inserts are already allowed by messages_admin_all 'for all'; employee
--    outbound inserts by messages_insert_employee — both unchanged.)
-- ----------------------------------------------------------------------------
drop policy if exists messages_insert_customer on public.messages;
create policy messages_insert_customer on public.messages
  for insert to authenticated
  with check (
    public.owns_conversation(conversation_id)
    and direction = 'incoming'
    and sender_id is null
  );

-- ----------------------------------------------------------------------------
-- 2) BUSINESS SETTINGS (single-row config, admin-only)
-- ----------------------------------------------------------------------------
create table if not exists public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text,
  business_email text,
  business_phone text,
  business_address text,
  default_commission numeric,
  logo_url text,
  updated_at timestamptz not null default now()
);

-- Seed the single row so the UI always has something to update.
insert into public.business_settings (id, business_name)
values (1, 'Wicket Travel')
on conflict (id) do nothing;

alter table public.business_settings enable row level security;

drop policy if exists business_settings_admin_all on public.business_settings;
create policy business_settings_admin_all on public.business_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3) REALTIME — settings live-sync (messages/conversations already added in 0005)
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.business_settings;
  exception when duplicate_object then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 4) STORAGE — "attachments" bucket policies (bucket already created, public)
--    Authenticated users may UPLOAD; the bucket is public so reads need no
--    policy. We also allow an uploader to update/delete their own objects.
-- ----------------------------------------------------------------------------
drop policy if exists attachments_authenticated_insert on storage.objects;
create policy attachments_authenticated_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments');

drop policy if exists attachments_owner_update on storage.objects;
create policy attachments_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid())
  with check (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists attachments_owner_delete on storage.objects;
create policy attachments_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

-- Public read (works even if the bucket's "public" flag is somehow off).
drop policy if exists attachments_public_read on storage.objects;
create policy attachments_public_read on storage.objects
  for select to public
  using (bucket_id = 'attachments');

-- ============================================================================
-- End of migration 0006
--
-- NOTE: customer-created orders (Book-a-Flight quote requests) are inserted by a
-- server action using the SERVICE-ROLE client AFTER verifying the session user
-- owns the customer row — so NO customer orders-insert RLS policy is needed.
-- ============================================================================
