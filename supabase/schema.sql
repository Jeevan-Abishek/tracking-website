-- =========================================================
-- Trailmark schema: trips + locations, RLS-secured, realtime
-- Run this in Supabase SQL Editor (or via `supabase db push`)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- TRIPS ----------
-- One row per share session. `share_code` is the 6-char code
-- the tracker enters. Only the rider (owner) can write; anyone
-- who knows the code can read the trip's public fields via the
-- `trip_public` view / RPC below (no direct table grant to anon).
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users(id) on delete cascade,
  rider_name text not null default 'Rider',
  share_code text not null unique,
  status text not null default 'active' check (status in ('active','ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_speed_kmh numeric,
  last_update timestamptz
);

create index if not exists trips_share_code_idx on public.trips (share_code);
create index if not exists trips_rider_id_idx on public.trips (rider_id);

-- ---------- LOCATION HISTORY ----------
create table if not exists public.trip_points (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kmh numeric,
  recorded_at timestamptz not null default now()
);

create index if not exists trip_points_trip_id_idx on public.trip_points (trip_id, recorded_at);

-- ---------- RLS ----------
alter table public.trips enable row level security;
alter table public.trip_points enable row level security;

-- Rider (owner) can do everything on their own trip
create policy "rider full access to own trips"
  on public.trips for all
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

create policy "rider full access to own trip points"
  on public.trip_points for all
  using (exists (
    select 1 from public.trips t
    where t.id = trip_points.trip_id and t.rider_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_points.trip_id and t.rider_id = auth.uid()
  ));

-- Anyone authenticated can READ a trip ONLY if they know the exact
-- share_code (enforced at the query layer via the RPC below, not
-- via a blanket SELECT policy). We do NOT add a public SELECT
-- policy on trips/trip_points directly — trackers only ever go
-- through get_trip_by_code(), which is SECURITY DEFINER.

-- ---------- SECURE LOOKUP RPC ----------
-- Trackers call this instead of querying the table directly, so a
-- code is required and no policy needs to expose the whole table.
create or replace function public.get_trip_by_code(p_code text)
returns table (
  id uuid,
  rider_name text,
  status text,
  started_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_speed_kmh numeric,
  last_update timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, rider_name, status, started_at, last_lat, last_lng, last_speed_kmh, last_update
  from public.trips
  where share_code = upper(p_code);
$$;

create or replace function public.get_trip_points_by_code(p_code text, p_since timestamptz default 'epoch')
returns table (lat double precision, lng double precision, recorded_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select tp.lat, tp.lng, tp.recorded_at
  from public.trip_points tp
  join public.trips t on t.id = tp.trip_id
  where t.share_code = upper(p_code) and tp.recorded_at > p_since
  order by tp.recorded_at asc
  limit 500;
$$;

grant execute on function public.get_trip_by_code(text) to anon, authenticated;
grant execute on function public.get_trip_points_by_code(text, timestamptz) to anon, authenticated;

-- ---------- REALTIME ----------
-- Enable realtime broadcast on trips so trackers get live updates
-- without polling (used alongside the RPC for the initial fetch).
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.trip_points;

-- ---------- CODE GENERATION HELPER ----------
create or replace function public.generate_share_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I ambiguity
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;
