-- 0024 — the per-passenger identity the admin "Create an order" wizard now
-- collects: who is travelling, how to reach them, their date of birth and the
-- booking-engine reference. Same contract as 0021 and 0022: the column is
-- nullable and additive, and createOrder drops it from the payload when this
-- has not been applied yet, so the deploy is safe in either order.

-- ---------------------------------------------------------------- orders
-- NOTE the name. orders.passengers already exists and is an INTEGER headcount
-- (adults + children); this roster is a different thing and must not collide
-- with it. `add column if not exists passengers` would have silently done
-- nothing and left the check below asserting jsonb_typeof() on an int.
--
-- Stored as jsonb on the order rather than in a child table, to match how this
-- schema already keeps its roster — passenger_names is a text[] and child_ages
-- an int[] on the same row. A child table would need its own RLS mirroring
-- orders and a second insert, and a roster is only ever read with its order,
-- so the join would buy nothing.
--
-- Shape: [{ "name": text, "email": text|null, "dob": "YYYY-MM-DD"|null,
--           "ibe": text|null }, ...]
-- The first entry is the customer the order is filed against; any after it are
-- the people travelling with them.
alter table public.orders
  add column if not exists passenger_details jsonb;

comment on column public.orders.passenger_details is
  'Per-passenger identity from the order wizard: name, email, date of birth and
   IBE (booking engine) reference. First entry is the account holder. Distinct
   from orders.passengers, which is the integer headcount, and from
   passenger_names, which stays the plain list used by the CSV export.';

-- Guard the shape so a malformed payload cannot land: it must be an array, and
-- short enough that one order cannot be used to store a bulk list. Matches
-- LIMITS.MAX_PASSENGERS in lib/security/limits.ts.
alter table public.orders
  drop constraint if exists orders_passenger_details_is_array;
alter table public.orders
  add constraint orders_passenger_details_is_array
  check (
    passenger_details is null
    or (
      jsonb_typeof(passenger_details) = 'array'
      and jsonb_array_length(passenger_details) <= 20
    )
  );
