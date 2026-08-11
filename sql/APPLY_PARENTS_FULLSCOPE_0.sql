-- ============================================================================
-- APPLY_PARENTS_FULLSCOPE_0.sql — Parents Tickets marketplace foundation
--
-- ► RUN THIS IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query,
--   paste the WHOLE file, Run). It is fully idempotent — safe to run again.
--
-- Prerequisites (both already applied on this project):
--   • APPLY_PARENTS_TICKETS.sql  — the basic lead-capture table
--   • APPLY_PARENTS_PUBLIC.sql   — the consent/publish flags
--   • migration 0022_person_fields.sql — profiles.phone (used by contact release)
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The database foundation for turning Parents Tickets from a lead-capture
--   form into a trusted marketplace, reusing the EXISTING customer login. A
--   customer can be a traveller, a requester, or both — there is no separate
--   account system, so every table below hangs off public.profiles.
--
--   Schema only. No UI depends on any of this yet; nothing here changes how
--   the basic feature behaves.
--
-- WHAT IT IS NOT
--   • It does NOT touch public.parent_ticket_enquiries. The existing homepage
--     form, the admin "Parents Tickets" tab and /api/parent-ticket/public keep
--     working exactly as they do today, on exactly the same rows.
--   • It does NOT add any anon policy anywhere. Nothing here is readable
--     without a session.
--   • It does NOT integrate Stripe/PayPal. Payments here are Stage A only:
--     an admin records money that moved outside the system.
--
-- WHAT IT CREATES
--   1) parent_ticket_identities  — ID document + verification state per person
--   2) parent_ticket_listings    — the full traveller listing / parent request
--   3) parent_ticket_matches     — a pairing of one traveller and one requester
--   4) parent_ticket_payments    — manual, admin-recorded money + commission
--   5) storage bucket 'parent-ticket-ids' (private) for ID documents
--   6) The contact-release rule, enforced in the database:
--        a person's phone/email is reachable ONLY through
--        public.parent_ticket_match_contact(match_id), and only when that match
--        has been explicitly released. There is no policy, view or column
--        anywhere below that exposes a counterparty's contact details before
--        release — regardless of match state.
--
-- THE PRIVILEGE MODEL (read this before adding UI on top)
--   RLS says WHICH ROWS you can touch. A BEFORE-trigger on each table says
--   WHICH COLUMNS you may change. That split matters: an owner can edit their
--   own listing, but silently cannot approve it, publish it, or write the
--   review fields — the trigger restores the old values instead of raising, so
--   a hostile client gets a no-op, not a probe-able error.
--
--   public.is_privileged_writer() is the escape hatch used by every guard:
--   an admin session, the service-role key, or a direct SQL-editor run.
-- ============================================================================


-- ============================================================================
-- 0) HELPERS
-- ============================================================================

-- Identical to the live definition (re-created so this file stands alone).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- True for an admin session, the service-role key, or a direct SQL-editor run.
-- PostgREST does SET LOCAL ROLE, so current_user is the honest signal for the
-- service key; auth.uid() is null there, which is why is_admin() alone is not
-- enough and a service-role write would otherwise be downgraded to an owner's.
--
-- ⚠ SECURITY INVOKER IS LOAD-BEARING. Inside a SECURITY DEFINER function
-- current_user is the function's OWNER, not the caller — so a DEFINER version
-- of this would read 'postgres' and return true for absolutely everyone,
-- silently disabling every guard below. For the same reason each tg_guard_*
-- function is INVOKER too: they must observe the real session role. Only
-- is_admin() is DEFINER, because it alone needs to read past profiles' RLS.
create or replace function public.is_privileged_writer()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.is_admin()
      or current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

grant execute on function public.is_privileged_writer() to authenticated, service_role;

-- Shared updated_at touch.
create or replace function public.tg_touch_parents_marketplace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ============================================================================
-- 1) IDENTITIES — verification state, one row per person (full scope item 1)
--
--    Deliberately NOT on profiles: this is Parents-Tickets-specific, it holds
--    a document reference, and it must be droppable without touching auth.
--
--    The SMS/OTP slot is present but unused — phone_verified stays false until
--    that phase lands. Email verification is the only channel wired for now.
-- ============================================================================
create table if not exists public.parent_ticket_identities (
  profile_id uuid primary key references public.profiles(id) on delete cascade,

  -- What the person told us, as it must appear on the document.
  legal_name    text,
  date_of_birth date,
  phone         text,

  -- The ID document itself. Path is a key inside the PRIVATE
  -- 'parent-ticket-ids' bucket; the portal serves short-lived signed URLs and
  -- never a public URL.
  id_document_type text,
  id_document_path text,
  id_document_uploaded_at timestamptz,

  -- Email verification (live). Phone/OTP slot (reserved, unused for now).
  email_verified    boolean not null default false,
  email_verified_at timestamptz,
  phone_verified    boolean not null default false,
  phone_verified_at timestamptz,

  -- Admin manual review — the gate that actually confers trust.
  verification_status text not null default 'unverified',
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_ticket_identities
  drop constraint if exists parent_ticket_identities_status_check;
alter table public.parent_ticket_identities
  add constraint parent_ticket_identities_status_check
  check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected'));

alter table public.parent_ticket_identities
  drop constraint if exists parent_ticket_identities_doc_type_check;
alter table public.parent_ticket_identities
  add constraint parent_ticket_identities_doc_type_check
  check (id_document_type is null or id_document_type in
    ('passport', 'driving_licence', 'national_id', 'residence_permit'));

create index if not exists parent_ticket_identities_status_idx
  on public.parent_ticket_identities (verification_status, updated_at desc);

comment on table public.parent_ticket_identities is
  'Parents Tickets identity verification, one row per profile. Reviewed by hand by an admin; no automated checks.';
comment on column public.parent_ticket_identities.phone_verified is
  'Reserved for the future SMS/OTP phase. Nothing sets this yet.';


-- ============================================================================
-- 2) LISTINGS — the full traveller listing AND the full parent request
--               (full scope items 2 + 5)
--
--    One table, two kinds, exactly like parent_ticket_enquiries.enquiry_type.
--    Matching is a self-join on this table, which is far simpler than pairing
--    two differently-shaped tables — and the shared columns (route, date,
--    languages, fee) really are shared.
--
--    Approval workflow:
--      draft → pending_review → approved | rejected
--    plus the terminal states matched / withdrawn / expired. Nothing is
--    matchable or publicly visible before 'approved'.
-- ============================================================================
create table if not exists public.parent_ticket_listings (
  id uuid primary key default gen_random_uuid(),

  -- Human reference "#PL-2001" — trigger-filled on insert.
  reference_number text,

  -- The owner. Reuses the existing customer login; one person may hold several
  -- listings of either kind.
  profile_id uuid not null references public.profiles(id) on delete cascade,

  listing_kind text not null,          -- 'traveller' | 'requester'

  -- ---- The flight -------------------------------------------------------
  from_airport   text not null,        -- IATA where known, free text otherwise
  to_airport     text not null,
  travel_date    date,
  departure_time time,
  airline        text,
  flight_number  text,
  -- "I have booked this flight" vs "these are my intended dates". A traveller
  -- listing is only worth matching once this is true.
  flight_confirmed boolean not null default false,

  -- ---- Shared detail ----------------------------------------------------
  languages     text[] not null default '{}',
  fee_amount    numeric(10, 2),        -- offered (traveller) or budgeted (requester)
  currency      text not null default 'GBP',
  notes         text,

  -- ---- Traveller side (offering help) -----------------------------------
  capacity           int,              -- how many parents on this flight
  assistance_offered text[] not null default '{}',
  travel_experience  text,             -- free text: how often they fly this route

  -- ---- Requester side (needs help) --------------------------------------
  parent_name       text,
  parent_age        int,
  relationship      text,
  assistance_needed text[] not null default '{}',
  -- General, NON-MEDICAL notes only. The product deliberately does not collect
  -- health information; these two describe practical support.
  mobility_notes    text,
  supervision_notes text,

  -- ---- Approval workflow (item 5) ---------------------------------------
  listing_status text not null default 'draft',
  submitted_at   timestamptz,
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  rejection_reason text,

  -- ---- Public board (same two-gate rule as the basic feature) -----------
  consent_public boolean not null default false,  -- the owner opted in
  is_public      boolean not null default false,  -- an admin approved display

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_kind_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_kind_check
  check (listing_kind in ('traveller', 'requester'));

alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_status_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_status_check
  check (listing_status in
    ('draft', 'pending_review', 'approved', 'rejected', 'matched', 'withdrawn', 'expired'));

-- Nothing publicly visible without the owner's own opt-in — the same rule, and
-- the same defence in depth, as parent_ticket_enquiries. The status half of the
-- rule is a trigger rather than a constraint (section 5) so that a listing
-- leaving the publishable states quietly unpublishes instead of erroring.
alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_public_consent_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_public_consent_check
  check (is_public = false or consent_public = true);

alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_fee_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_fee_check
  check (fee_amount is null or (fee_amount >= 0 and fee_amount <= 5000));

alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_capacity_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_capacity_check
  check (capacity is null or (capacity >= 0 and capacity <= 20));

alter table public.parent_ticket_listings
  drop constraint if exists parent_ticket_listings_parent_age_check;
alter table public.parent_ticket_listings
  add constraint parent_ticket_listings_parent_age_check
  check (parent_age is null or (parent_age >= 0 and parent_age <= 120));

-- The search + matching query paths (item 4).
create index if not exists parent_ticket_listings_match_idx
  on public.parent_ticket_listings (listing_kind, listing_status, travel_date);
create index if not exists parent_ticket_listings_route_idx
  on public.parent_ticket_listings (from_airport, to_airport, travel_date);
create index if not exists parent_ticket_listings_owner_idx
  on public.parent_ticket_listings (profile_id, created_at desc);
create index if not exists parent_ticket_listings_review_idx
  on public.parent_ticket_listings (listing_status, submitted_at desc);
create index if not exists parent_ticket_listings_languages_idx
  on public.parent_ticket_listings using gin (languages);
create index if not exists parent_ticket_listings_offered_idx
  on public.parent_ticket_listings using gin (assistance_offered);
create index if not exists parent_ticket_listings_needed_idx
  on public.parent_ticket_listings using gin (assistance_needed);

comment on table public.parent_ticket_listings is
  'Full Parents Tickets listings. listing_kind = traveller (offering help) or requester (needs help for a parent). Nothing is matchable or public before listing_status = approved.';
comment on column public.parent_ticket_listings.mobility_notes is
  'General, non-medical practical support notes. The product does not collect health data.';


-- ============================================================================
-- 3) MATCHES — one traveller listing paired with one requester listing
--              (full scope items 4 + 6)
--
--    A match is created by search/ranking or by an admin, then each side
--    responds. Contact details stay sealed until contact_released flips — see
--    section 6, which is the only route to them.
-- ============================================================================
create table if not exists public.parent_ticket_matches (
  id uuid primary key default gen_random_uuid(),

  -- Human reference "#PM-3001" — trigger-filled on insert.
  reference_number text,

  traveller_listing_id uuid not null
    references public.parent_ticket_listings(id) on delete cascade,
  requester_listing_id uuid not null
    references public.parent_ticket_listings(id) on delete cascade,

  -- 0–100 ranking from the matcher: route, date, language, assistance, fee.
  match_score int,
  match_reason text,                  -- human-readable "why these two"

  match_status text not null default 'suggested',

  -- Each side answers for itself; the guard trigger in section 5 makes sure a
  -- party can only ever write their OWN response column.
  traveller_response text not null default 'pending',
  requester_response text not null default 'pending',

  -- ---- The contact-release gate (item 6) --------------------------------
  -- Nothing else in this schema unlocks contact details. Stage A ties this to
  -- a recorded payment by hand: an admin marks the payment paid, then releases.
  contact_released    boolean not null default false,
  contact_released_at timestamptz,
  contact_released_by uuid references public.profiles(id) on delete set null,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_ticket_matches
  drop constraint if exists parent_ticket_matches_distinct_check;
alter table public.parent_ticket_matches
  add constraint parent_ticket_matches_distinct_check
  check (traveller_listing_id <> requester_listing_id);

alter table public.parent_ticket_matches
  drop constraint if exists parent_ticket_matches_status_check;
alter table public.parent_ticket_matches
  add constraint parent_ticket_matches_status_check
  check (match_status in
    ('suggested', 'proposed', 'accepted', 'declined', 'contact_released', 'completed', 'cancelled'));

alter table public.parent_ticket_matches
  drop constraint if exists parent_ticket_matches_traveller_response_check;
alter table public.parent_ticket_matches
  add constraint parent_ticket_matches_traveller_response_check
  check (traveller_response in ('pending', 'accepted', 'declined'));

alter table public.parent_ticket_matches
  drop constraint if exists parent_ticket_matches_requester_response_check;
alter table public.parent_ticket_matches
  add constraint parent_ticket_matches_requester_response_check
  check (requester_response in ('pending', 'accepted', 'declined'));

alter table public.parent_ticket_matches
  drop constraint if exists parent_ticket_matches_score_check;
alter table public.parent_ticket_matches
  add constraint parent_ticket_matches_score_check
  check (match_score is null or (match_score >= 0 and match_score <= 100));

-- The same two listings are one match, however many times the matcher runs.
create unique index if not exists parent_ticket_matches_pair_key
  on public.parent_ticket_matches (traveller_listing_id, requester_listing_id);

create index if not exists parent_ticket_matches_traveller_idx
  on public.parent_ticket_matches (traveller_listing_id, match_status);
create index if not exists parent_ticket_matches_requester_idx
  on public.parent_ticket_matches (requester_listing_id, match_status);
create index if not exists parent_ticket_matches_queue_idx
  on public.parent_ticket_matches (match_status, match_score desc nulls last, created_at desc);

comment on column public.parent_ticket_matches.contact_released is
  'The ONLY switch that makes the two parties contact details reachable, and then only through public.parent_ticket_match_contact().';


-- ============================================================================
-- 4) PAYMENTS — Stage A: ADMIN-MANAGED / MANUAL ONLY (full scope item 7)
--
--    Nothing here talks to a payment provider. An admin records money that
--    moved outside the system (bank transfer, cash, a card machine), the
--    commission Wicket kept, and what is owed onward. Real Stripe/PayPal is a
--    separate future phase; when it lands it adds columns here, it does not
--    replace this table.
-- ============================================================================
create table if not exists public.parent_ticket_payments (
  id uuid primary key default gen_random_uuid(),

  -- Human reference "#PP-4001" — trigger-filled on insert.
  reference_number text,

  match_id uuid not null
    references public.parent_ticket_matches(id) on delete cascade,

  -- Who paid (normally the requester) and who is owed (normally the traveller).
  payer_profile_id uuid references public.profiles(id) on delete set null,
  payee_profile_id uuid references public.profiles(id) on delete set null,

  gross_amount      numeric(10, 2) not null default 0,  -- what the payer paid
  commission_amount numeric(10, 2) not null default 0,  -- what Wicket kept
  payout_amount     numeric(10, 2) not null default 0,  -- what the payee gets
  currency          text not null default 'GBP',

  payment_status text not null default 'unpaid',
  payment_method text,
  paid_at        timestamptz,
  payout_at      timestamptz,

  -- The admin's own record: bank reference, receipt number, who confirmed it.
  reference_note text,
  recorded_by    uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_ticket_payments
  drop constraint if exists parent_ticket_payments_status_check;
alter table public.parent_ticket_payments
  add constraint parent_ticket_payments_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'cancelled'));

alter table public.parent_ticket_payments
  drop constraint if exists parent_ticket_payments_method_check;
alter table public.parent_ticket_payments
  add constraint parent_ticket_payments_method_check
  check (payment_method is null or payment_method in
    ('bank_transfer', 'cash', 'card_manual', 'other'));

alter table public.parent_ticket_payments
  drop constraint if exists parent_ticket_payments_amount_check;
alter table public.parent_ticket_payments
  add constraint parent_ticket_payments_amount_check
  check (gross_amount >= 0 and commission_amount >= 0 and payout_amount >= 0);

create index if not exists parent_ticket_payments_match_idx
  on public.parent_ticket_payments (match_id);
create index if not exists parent_ticket_payments_status_idx
  on public.parent_ticket_payments (payment_status, created_at desc);

comment on table public.parent_ticket_payments is
  'Stage A manual payment records for Parents Tickets. No provider integration — an admin records money that moved outside the system.';


-- ============================================================================
-- 5) REFERENCE NUMBERS, TOUCH TRIGGERS AND COLUMN GUARDS
-- ============================================================================

create sequence if not exists public.parent_ticket_listing_ref_seq start with 2001;
create sequence if not exists public.parent_ticket_match_ref_seq   start with 3001;
create sequence if not exists public.parent_ticket_payment_ref_seq start with 4001;

create or replace function public.tg_set_parent_ticket_listing_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference_number is null or new.reference_number = '' then
    new.reference_number := '#PL-' || nextval('public.parent_ticket_listing_ref_seq')::text;
  end if;
  return new;
end;
$$;

create or replace function public.tg_set_parent_ticket_match_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference_number is null or new.reference_number = '' then
    new.reference_number := '#PM-' || nextval('public.parent_ticket_match_ref_seq')::text;
  end if;
  return new;
end;
$$;

create or replace function public.tg_set_parent_ticket_payment_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference_number is null or new.reference_number = '' then
    new.reference_number := '#PP-' || nextval('public.parent_ticket_payment_ref_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_parent_ticket_listing_reference on public.parent_ticket_listings;
create trigger trg_set_parent_ticket_listing_reference
  before insert on public.parent_ticket_listings
  for each row execute function public.tg_set_parent_ticket_listing_reference();

drop trigger if exists trg_set_parent_ticket_match_reference on public.parent_ticket_matches;
create trigger trg_set_parent_ticket_match_reference
  before insert on public.parent_ticket_matches
  for each row execute function public.tg_set_parent_ticket_match_reference();

drop trigger if exists trg_set_parent_ticket_payment_reference on public.parent_ticket_payments;
create trigger trg_set_parent_ticket_payment_reference
  before insert on public.parent_ticket_payments
  for each row execute function public.tg_set_parent_ticket_payment_reference();

create unique index if not exists parent_ticket_listings_reference_key
  on public.parent_ticket_listings (reference_number);
create unique index if not exists parent_ticket_matches_reference_key
  on public.parent_ticket_matches (reference_number);
create unique index if not exists parent_ticket_payments_reference_key
  on public.parent_ticket_payments (reference_number);

drop trigger if exists trg_touch_parent_ticket_identities on public.parent_ticket_identities;
create trigger trg_touch_parent_ticket_identities
  before update on public.parent_ticket_identities
  for each row execute function public.tg_touch_parents_marketplace();

drop trigger if exists trg_touch_parent_ticket_listings on public.parent_ticket_listings;
create trigger trg_touch_parent_ticket_listings
  before update on public.parent_ticket_listings
  for each row execute function public.tg_touch_parents_marketplace();

drop trigger if exists trg_touch_parent_ticket_matches on public.parent_ticket_matches;
create trigger trg_touch_parent_ticket_matches
  before update on public.parent_ticket_matches
  for each row execute function public.tg_touch_parents_marketplace();

drop trigger if exists trg_touch_parent_ticket_payments on public.parent_ticket_payments;
create trigger trg_touch_parent_ticket_payments
  before update on public.parent_ticket_payments
  for each row execute function public.tg_touch_parents_marketplace();


-- ---- Guard: identities ------------------------------------------------------
-- A person may upload their document and submit for review. They may not mark
-- themselves verified, write the review fields, or flip email/phone verified.
create or replace function public.tg_guard_parent_ticket_identity()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verification_status not in ('unverified', 'pending_review') then
      new.verification_status := 'unverified';
    end if;
    new.email_verified := false;
    new.email_verified_at := null;
    new.phone_verified := false;
    new.phone_verified_at := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- UPDATE: every trust-conferring field keeps its old value.
  new.profile_id        := old.profile_id;
  new.email_verified    := old.email_verified;
  new.email_verified_at := old.email_verified_at;
  new.phone_verified    := old.phone_verified;
  new.phone_verified_at := old.phone_verified_at;
  new.reviewed_by       := old.reviewed_by;
  new.reviewed_at       := old.reviewed_at;
  new.rejection_reason  := old.rejection_reason;

  -- The owner may only hand the record TO review, or re-open a rejected one.
  if new.verification_status is distinct from old.verification_status
     and not (
       (old.verification_status in ('unverified', 'rejected')
          and new.verification_status = 'pending_review')
       or (old.verification_status = 'pending_review'
          and new.verification_status = 'unverified')
     )
  then
    new.verification_status := old.verification_status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_parent_ticket_identity on public.parent_ticket_identities;
create trigger trg_guard_parent_ticket_identity
  before insert or update on public.parent_ticket_identities
  for each row execute function public.tg_guard_parent_ticket_identity();


-- ---- Guard: listings --------------------------------------------------------
-- An owner writes the content of their own listing. Approval and publication
-- are admin-only, and the owner cannot reassign a listing to someone else.
create or replace function public.tg_guard_parent_ticket_listing()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.profile_id := auth.uid();
    if new.listing_status not in ('draft', 'pending_review') then
      new.listing_status := 'draft';
    end if;
    new.is_public        := false;
    new.reviewed_by      := null;
    new.reviewed_at      := null;
    new.rejection_reason := null;
    if new.listing_status = 'pending_review' and new.submitted_at is null then
      new.submitted_at := now();
    end if;
    return new;
  end if;

  new.profile_id       := old.profile_id;
  new.reference_number := old.reference_number;
  new.is_public        := old.is_public;
  new.reviewed_by      := old.reviewed_by;
  new.reviewed_at      := old.reviewed_at;
  new.rejection_reason := old.rejection_reason;

  -- draft ⇄ pending_review, re-submit after a rejection, or withdraw. Anything
  -- else (notably → approved) silently keeps the old status.
  if new.listing_status is distinct from old.listing_status then
    if old.listing_status in ('draft', 'rejected') and new.listing_status = 'pending_review' then
      new.submitted_at := now();
    elsif old.listing_status = 'pending_review' and new.listing_status = 'draft' then
      new.submitted_at := null;
    elsif new.listing_status = 'withdrawn'
          and old.listing_status in ('draft', 'pending_review', 'approved', 'rejected') then
      null;
    else
      new.listing_status := old.listing_status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_parent_ticket_listing on public.parent_ticket_listings;
create trigger trg_guard_parent_ticket_listing
  before insert or update on public.parent_ticket_listings
  for each row execute function public.tg_guard_parent_ticket_listing();

-- The status half of the public-board rule, for everyone including admins: a
-- listing that is not approved (or already matched) cannot be on the board.
-- Written as a trigger so withdrawing or expiring a published listing simply
-- takes it down instead of failing the update.
create or replace function public.tg_sync_parent_ticket_listing_public()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_public and (
       new.consent_public = false
       or new.listing_status not in ('approved', 'matched')
     ) then
    new.is_public := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_parent_ticket_listing_public on public.parent_ticket_listings;
create trigger trg_sync_parent_ticket_listing_public
  before insert or update on public.parent_ticket_listings
  for each row execute function public.tg_sync_parent_ticket_listing_public();


-- ---- Guard: matches ---------------------------------------------------------
-- A party answers for their OWN side and nothing else. Above all, no
-- non-admin write can ever set contact_released.
create or replace function public.tg_guard_parent_ticket_match()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  is_traveller boolean;
  is_requester boolean;
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  -- Only an admin or the service role creates a match.
  if tg_op = 'INSERT' then
    raise exception 'Matches are created by Wicket, not by a party.'
      using errcode = 'insufficient_privilege';
  end if;

  select exists (
    select 1 from public.parent_ticket_listings l
    where l.id = old.traveller_listing_id and l.profile_id = auth.uid()
  ) into is_traveller;

  select exists (
    select 1 from public.parent_ticket_listings l
    where l.id = old.requester_listing_id and l.profile_id = auth.uid()
  ) into is_requester;

  -- Everything except this party's own response column is restored.
  new.id                   := old.id;
  new.reference_number     := old.reference_number;
  new.traveller_listing_id := old.traveller_listing_id;
  new.requester_listing_id := old.requester_listing_id;
  new.match_score          := old.match_score;
  new.match_reason         := old.match_reason;
  new.match_status         := old.match_status;
  new.contact_released     := old.contact_released;
  new.contact_released_at  := old.contact_released_at;
  new.contact_released_by  := old.contact_released_by;
  new.created_by           := old.created_by;

  if not is_traveller then new.traveller_response := old.traveller_response; end if;
  if not is_requester then new.requester_response := old.requester_response; end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_parent_ticket_match on public.parent_ticket_matches;
create trigger trg_guard_parent_ticket_match
  before insert or update on public.parent_ticket_matches
  for each row execute function public.tg_guard_parent_ticket_match();

-- Keep contact_released and match_status honest with each other, whoever wrote
-- them — including an admin or the service role.
create or replace function public.tg_sync_parent_ticket_match_release()
returns trigger language plpgsql set search_path = public as $$
declare
  was_released boolean := (tg_op = 'UPDATE' and old.contact_released);
begin
  if new.contact_released and not coalesce(was_released, false) then
    new.contact_released_at := coalesce(new.contact_released_at, now());
    if new.match_status in ('suggested', 'proposed', 'accepted') then
      new.match_status := 'contact_released';
    end if;
  elsif not new.contact_released then
    new.contact_released_at := null;
    new.contact_released_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_parent_ticket_match_release on public.parent_ticket_matches;
create trigger trg_sync_parent_ticket_match_release
  before insert or update on public.parent_ticket_matches
  for each row execute function public.tg_sync_parent_ticket_match_release();


-- ---- Guard: payments --------------------------------------------------------
-- Money is admin-only, full stop. A party can read their own record (section 7)
-- but no non-admin write reaches this table at all.
create or replace function public.tg_guard_parent_ticket_payment()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if public.is_privileged_writer() then
    -- On DELETE, NEW is unassigned; returning it would cancel the delete.
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  raise exception 'Payment records are written by Wicket only.'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists trg_guard_parent_ticket_payment on public.parent_ticket_payments;
create trigger trg_guard_parent_ticket_payment
  before insert or update or delete on public.parent_ticket_payments
  for each row execute function public.tg_guard_parent_ticket_payment();


-- ============================================================================
-- 6) THE CONTACT-RELEASE RULE (full scope item 6)
--
--    There is no policy, view or column anywhere in this file that lets one
--    person read another's email or phone. The ONLY route is the function
--    below, and it answers nothing unless:
--      • the caller is a party to that exact match (or an admin), AND
--      • that match has been explicitly released.
--
--    SECURITY DEFINER is what makes it work — profiles' own RLS would
--    otherwise hide the counterparty — which is precisely why the two
--    conditions are inside the query and not the caller's responsibility.
-- ============================================================================

create or replace function public.is_parent_ticket_party(
  p_match_id   uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_ticket_matches m
    join public.parent_ticket_listings l
      on l.id in (m.traveller_listing_id, m.requester_listing_id)
    where m.id = p_match_id
      and l.profile_id = p_profile_id
  );
$$;

create or replace function public.parent_ticket_match_contact(p_match_id uuid)
returns table (
  profile_id uuid,
  side       text,
  full_name  text,
  email      text,
  phone      text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case when l.id = m.traveller_listing_id then 'traveller' else 'requester' end,
    p.full_name,
    p.email,
    coalesce(i.phone, p.phone)
  from public.parent_ticket_matches m
  join public.parent_ticket_listings l
    on l.id in (m.traveller_listing_id, m.requester_listing_id)
  join public.profiles p
    on p.id = l.profile_id
  left join public.parent_ticket_identities i
    on i.profile_id = p.id
  where m.id = p_match_id
    -- GATE 1: the match must have been released by hand.
    and m.contact_released = true
    -- GATE 2: the caller must be one of the two parties, or an admin.
    and (
      public.is_parent_ticket_party(m.id, auth.uid())
      or public.is_admin()
    );
$$;

revoke all on function public.parent_ticket_match_contact(uuid) from public, anon;
grant execute on function public.parent_ticket_match_contact(uuid) to authenticated;

comment on function public.parent_ticket_match_contact(uuid) is
  'The only route to a counterparty contact detail. Returns nothing unless the match is released AND the caller is a party to it (or an admin).';


-- ============================================================================
-- 7) RLS — every table on, no anon policy anywhere
-- ============================================================================

-- ---- identities -------------------------------------------------------------
alter table public.parent_ticket_identities enable row level security;

drop policy if exists parent_ticket_identities_admin_all on public.parent_ticket_identities;
create policy parent_ticket_identities_admin_all on public.parent_ticket_identities
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists parent_ticket_identities_own_read on public.parent_ticket_identities;
create policy parent_ticket_identities_own_read on public.parent_ticket_identities
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists parent_ticket_identities_own_insert on public.parent_ticket_identities;
create policy parent_ticket_identities_own_insert on public.parent_ticket_identities
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists parent_ticket_identities_own_update on public.parent_ticket_identities;
create policy parent_ticket_identities_own_update on public.parent_ticket_identities
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
-- No own-delete: a verification record is an audit trail.

-- ---- listings ---------------------------------------------------------------
alter table public.parent_ticket_listings enable row level security;

drop policy if exists parent_ticket_listings_admin_all on public.parent_ticket_listings;
create policy parent_ticket_listings_admin_all on public.parent_ticket_listings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A signed-in user sees their own listings in any state, and everyone else's
-- only once approved. That is what makes search (item 4) possible without
-- exposing anything: a listing row carries NO contact details — those live on
-- profiles / parent_ticket_identities and are unreachable across users.
drop policy if exists parent_ticket_listings_read on public.parent_ticket_listings;
create policy parent_ticket_listings_read on public.parent_ticket_listings
  for select to authenticated
  using (profile_id = auth.uid() or listing_status = 'approved');

drop policy if exists parent_ticket_listings_own_insert on public.parent_ticket_listings;
create policy parent_ticket_listings_own_insert on public.parent_ticket_listings
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists parent_ticket_listings_own_update on public.parent_ticket_listings;
create policy parent_ticket_listings_own_update on public.parent_ticket_listings
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Deleting is only ever allowed while nobody has acted on it.
drop policy if exists parent_ticket_listings_own_delete on public.parent_ticket_listings;
create policy parent_ticket_listings_own_delete on public.parent_ticket_listings
  for delete to authenticated
  using (profile_id = auth.uid() and listing_status = 'draft');

-- ---- matches ----------------------------------------------------------------
alter table public.parent_ticket_matches enable row level security;

drop policy if exists parent_ticket_matches_admin_all on public.parent_ticket_matches;
create policy parent_ticket_matches_admin_all on public.parent_ticket_matches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists parent_ticket_matches_party_read on public.parent_ticket_matches;
create policy parent_ticket_matches_party_read on public.parent_ticket_matches
  for select to authenticated
  using (public.is_parent_ticket_party(id, auth.uid()));

-- A party may write, but the guard trigger narrows that to their own response.
drop policy if exists parent_ticket_matches_party_update on public.parent_ticket_matches;
create policy parent_ticket_matches_party_update on public.parent_ticket_matches
  for update to authenticated
  using (public.is_parent_ticket_party(id, auth.uid()))
  with check (public.is_parent_ticket_party(id, auth.uid()));

-- ---- payments ---------------------------------------------------------------
alter table public.parent_ticket_payments enable row level security;

drop policy if exists parent_ticket_payments_admin_all on public.parent_ticket_payments;
create policy parent_ticket_payments_admin_all on public.parent_ticket_payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A party can see the money on their own match — never write it.
drop policy if exists parent_ticket_payments_party_read on public.parent_ticket_payments;
create policy parent_ticket_payments_party_read on public.parent_ticket_payments
  for select to authenticated
  using (public.is_parent_ticket_party(match_id, auth.uid()));


-- ============================================================================
-- 8) STORAGE — private bucket for ID documents
--    The owner uploads into a folder named after their own uid; only they and
--    an admin can read it back, and the portal always serves a short-lived
--    signed URL rather than a path. No anon policy.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parent-ticket-ids',
  'parent-ticket-ids',
  false,
  10485760, -- 10MB per file
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

drop policy if exists parent_ticket_ids_own_insert on storage.objects;
create policy parent_ticket_ids_own_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'parent-ticket-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists parent_ticket_ids_own_read on storage.objects;
create policy parent_ticket_ids_own_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'parent-ticket-ids'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists parent_ticket_ids_own_update on storage.objects;
create policy parent_ticket_ids_own_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'parent-ticket-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists parent_ticket_ids_delete on storage.objects;
create policy parent_ticket_ids_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'parent-ticket-ids'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );


-- ============================================================================
-- 9) REALTIME — the admin queues update live, like Orders and Messages
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'parent_ticket_listings'
    ) then
      alter publication supabase_realtime add table public.parent_ticket_listings;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'parent_ticket_matches'
    ) then
      alter publication supabase_realtime add table public.parent_ticket_matches;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'parent_ticket_identities'
    ) then
      alter publication supabase_realtime add table public.parent_ticket_identities;
    end if;
  end if;
end
$$;


-- ============================================================================
-- 10) VERIFY — run this last block on its own to see what landed.
--     Every row should read PRESENT / ON.
-- ============================================================================
select 'table: ' || t as item,
       case when to_regclass('public.' || t) is not null then 'PRESENT' else 'MISSING' end as state
from unnest(array[
  'parent_ticket_identities',
  'parent_ticket_listings',
  'parent_ticket_matches',
  'parent_ticket_payments'
]) as t
union all
select 'function: ' || p, case when exists (
  select 1 from pg_proc where proname = p) then 'PRESENT' else 'MISSING' end
from unnest(array[
  'is_privileged_writer',
  'is_parent_ticket_party',
  'parent_ticket_match_contact'
]) as p
union all
select 'rls: ' || c.relname, case when c.relrowsecurity then 'ON' else 'OFF' end
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'parent_ticket_identities', 'parent_ticket_listings',
    'parent_ticket_matches', 'parent_ticket_payments'
  )
union all
select 'bucket: parent-ticket-ids',
       case when exists (select 1 from storage.buckets where id = 'parent-ticket-ids')
            then 'PRESENT' else 'MISSING' end
order by 1;


-- ============================================================================
-- Done. Nothing in the portal changes yet — the basic lead-capture feature and
-- its public board are untouched. The next chunk builds UI on top of this.
-- ============================================================================
