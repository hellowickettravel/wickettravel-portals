-- ============================================================================
-- Wicket — Customer C1: private attachments + scoped storage, public branding
-- Migration 0014
--
-- Safe to run more than once. Apply AFTER 0002–0013.
--
-- WHAT THIS DOES
--   1) Makes the "attachments" bucket PRIVATE and replaces the old
--      bucket-id-only / public-read policies with CONVERSATION-SCOPED insert +
--      read policies. Customer documents (passports, IDs, tickets) can no longer
--      be fetched via a guessed/leaked public URL — reads go through expiring
--      signed URLs minted server-side, and only conversation participants
--      (admin / assigned employee / owning customer) can sign or upload.
--   2) Creates a SEPARATE PUBLIC "branding" bucket for the business logo (which
--      is meant to be world-readable), so the private switch can't expose docs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) HELPERS
--    Resolve the conversation id embedded in an object key and check access.
--    Path convention: `conversation/<conversation_id>/<file>`. Legacy keys of
--    the form `<conversation_id>/<file>` are also supported so existing
--    attachments keep working.
-- ----------------------------------------------------------------------------
create or replace function public.storage_conversation_id(object_name text)
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
  -- New convention: conversation/<id>/<file>. Legacy: <id>/<file>.
  if parts[1] = 'conversation' then
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

-- Caller may access this conversation: admin, assigned employee, or owning
-- customer. SECURITY DEFINER (reuses the existing helpers, which already bypass
-- RLS internally to avoid recursion).
create or replace function public.can_access_conversation(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select conv is not null and (
    public.is_admin()
    or public.is_assigned_to_conversation(conv)
    or public.owns_conversation(conv)
  );
$$;

-- ----------------------------------------------------------------------------
-- 2) ATTACHMENTS — flip to PRIVATE + scope insert/read to conversation access
-- ----------------------------------------------------------------------------
update storage.buckets set public = false where id = 'attachments';

-- Drop the old permissive policies (bucket-id-only insert, public read).
drop policy if exists attachments_public_read on storage.objects;
drop policy if exists attachments_authenticated_insert on storage.objects;

-- Read: only participants of the object's conversation may select (and thus sign).
drop policy if exists attachments_scoped_read on storage.objects;
create policy attachments_scoped_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_access_conversation(public.storage_conversation_id(name))
  );

-- Insert: only into a path for a conversation the caller can access.
drop policy if exists attachments_scoped_insert on storage.objects;
create policy attachments_scoped_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.can_access_conversation(public.storage_conversation_id(name))
  );

-- Keep owner-scoped update/delete (uploader can manage their own object).
drop policy if exists attachments_owner_update on storage.objects;
create policy attachments_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid())
  with check (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists attachments_owner_delete on storage.objects;
create policy attachments_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

-- ----------------------------------------------------------------------------
-- 3) BRANDING — separate PUBLIC bucket for the business logo
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select to public
  using (bucket_id = 'branding');

drop policy if exists branding_admin_insert on storage.objects;
create policy branding_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_delete on storage.objects;
create policy branding_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and public.is_admin());

-- ============================================================================
-- End of migration 0014
--
-- NOTE: customer DELETE now also removes the auth user (admin.auth.admin
-- .deleteUser) + profile row in lib/actions/admin.ts. customers.profile_id is
-- already ON DELETE SET NULL (0003) and orders are detached in code, so no
-- additional FK/cascade change is required here.
-- ============================================================================
