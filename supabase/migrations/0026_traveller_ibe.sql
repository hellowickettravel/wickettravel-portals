-- 0026 — Travel details: an IBE number on each traveller.
--
-- Additive only: one new, nullable column on the `travellers` table from
-- 0025. Nothing else changes, and running it twice is harmless.
--
-- Until this has been run, Travel details keeps working exactly as before;
-- only saving an IBE number is refused, with a message pointing here.

alter table public.travellers
  add column if not exists ibe_number text;

comment on column public.travellers.ibe_number is
  'The traveller''s IBE number, entered by an admin on Travel details.';
