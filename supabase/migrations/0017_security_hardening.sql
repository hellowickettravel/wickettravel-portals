-- ============================================================================
-- Wicket — Security hardening (Migration 0017)
--
-- Adds the pieces the engineer-level hardening pass needs at the DB/storage
-- layer. Fully idempotent — safe to run more than once.
--
--   1) auth_attempts — a server-side attempt log powering login/signup rate
--      limiting + temporary lockout (we have no paid WAF, so the app enforces
--      it). Written/read ONLY by the service-role server actions; RLS is ON with
--      NO policies, so no authenticated/anon client can ever read or write it.
--   2) STORAGE bucket hardening — enforce a file-type allowlist + size cap at the
--      bucket level (not just client-side), on both private attachment buckets,
--      so a crafted upload can't smuggle in an SVG/HTML (stored-XSS) or a huge
--      file. The public 'branding' bucket is images-only + small.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) AUTH ATTEMPT LOG  (brute-force / credential-stuffing / bot-signup defence)
-- ----------------------------------------------------------------------------
create table if not exists public.auth_attempts (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('login', 'signup')),
  ip         text,                 -- best-effort client IP (x-forwarded-for)
  email_hash text,                 -- sha-256 of lowercased email (never the raw email)
  success    boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sliding-window lookups are by (ip / email_hash, kind, time).
create index if not exists auth_attempts_ip_idx
  on public.auth_attempts (ip, kind, created_at desc);
create index if not exists auth_attempts_email_idx
  on public.auth_attempts (email_hash, kind, created_at desc);
create index if not exists auth_attempts_created_idx
  on public.auth_attempts (created_at);

-- RLS ON, zero policies → totally invisible to authenticated + anon clients.
-- The service-role key (server actions only) bypasses RLS and is the sole
-- reader/writer.
alter table public.auth_attempts enable row level security;


-- ----------------------------------------------------------------------------
-- 2) STORAGE — enforce MIME allowlist + size cap at the bucket level.
--    Client validation already limits this, but the bucket is the real gate:
--    a direct supabase-js upload can't bypass these. Note SVG is deliberately
--    EXCLUDED (an SVG can carry <script>, so it is a stored-XSS vector).
-- ----------------------------------------------------------------------------

-- Private per-conversation chat attachments: images + PDF, max 10 MB.
update storage.buckets
  set file_size_limit = 10485760,  -- 10 MB
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
  where id = 'attachments';

-- Private per-order inbox / pre-order attachments: same policy.
update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
  where id = 'order-attachments';

-- Public branding logo bucket: raster images only (no SVG), max 5 MB.
update storage.buckets
  set file_size_limit = 5242880,   -- 5 MB
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  where id = 'branding';

-- ============================================================================
-- End of migration 0017
-- ============================================================================
