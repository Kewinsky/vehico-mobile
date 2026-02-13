-- Vehico (MVP) schema for hosted Supabase
-- Run this in Supabase Dashboard → SQL Editor to set up the database from scratch.

-- ================
-- Extensions
-- ================

drop extension if exists "pgcrypto" cascade;
create extension if not exists "pgcrypto";

-- ================
-- Tables
-- ================

-- Vehicles (cars + motorcycles)
drop table if exists public.vehicles cascade;
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  type text not null check (type in ('car', 'motorcycle')),
  vin text,
  make text not null,
  model text not null,
  production_year integer not null,
  mileage integer, -- current mileage in km
  engine_capacity integer, -- in cm³
  power_hp integer, -- horsepower
  fuel_type text check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'lpg')),
  transmission text check (transmission in ('manual', 'automatic')),
  drive_type text check (drive_type in ('FWD', 'RWD', 'AWD')),
  notes text,
  insurance_valid_until date,
  inspection_valid_until date,
  created_at timestamptz not null default now()
);

drop index if exists public.vehicles_owner_id_idx;
create index if not exists vehicles_owner_id_idx on public.vehicles(owner_id);
drop index if exists public.vehicles_created_at_idx;
create index if not exists vehicles_created_at_idx on public.vehicles(created_at desc);

-- Workshops (per user, not per vehicle)
drop table if exists public.workshops cascade;
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  workshop_type text not null check (workshop_type in (
    'mechanic', 'electrician', 'detailer', 'bodywork', 'car_wash', 'other'
  )),
  phone_number text,
  address text,
  created_at timestamptz not null default now()
);

drop index if exists public.workshops_owner_id_idx;
create index if not exists workshops_owner_id_idx on public.workshops(owner_id);

-- Service entries (timeline)
drop table if exists public.service_entries cascade;
create table if not exists public.service_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_date date not null,
  mileage integer,
  category text not null default 'other',
  title text not null,
  description text not null default '',
  cost numeric,
  workshop_id uuid references public.workshops(id) on delete set null,
  created_at timestamptz not null default now()
);

drop index if exists public.service_entries_vehicle_id_idx;
create index if not exists service_entries_vehicle_id_idx on public.service_entries(vehicle_id);
drop index if exists public.service_entries_service_date_idx;
create index if not exists service_entries_service_date_idx on public.service_entries(service_date desc);
drop index if exists public.service_entries_workshop_id_idx;
create index if not exists service_entries_workshop_id_idx on public.service_entries(workshop_id);

-- Attachments and vehicle_documents are stored locally on device (SQLite + file system).
-- See: src/services/localStorage/

-- Reports (immutable snapshots for public reports)
drop table if exists public.reports cascade;
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  public_id text not null default replace(gen_random_uuid()::text, '-', ''),
  title text,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (public_id)
);

drop index if exists public.reports_vehicle_id_idx;
create index if not exists reports_vehicle_id_idx on public.reports(vehicle_id);
drop index if exists public.reports_public_id_idx;
create index if not exists reports_public_id_idx on public.reports(public_id);
drop index if exists public.reports_created_at_idx;
create index if not exists reports_created_at_idx on public.reports(created_at desc);

-- Fueling entries (lightweight)
drop table if exists public.fueling_entries cascade;
create table if not exists public.fueling_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  distance numeric not null,
  fuel_amount numeric not null,
  fuel_cost numeric not null,
  fuel_type text check (fuel_type is null or fuel_type in ('95', '98', '100', 'on', 'lpg')),
  gas_station text,
  created_at timestamptz not null default now()
);

drop index if exists public.fueling_entries_vehicle_id_idx;
create index if not exists fueling_entries_vehicle_id_idx on public.fueling_entries(vehicle_id);
drop index if exists public.fueling_entries_date_idx;
create index if not exists fueling_entries_date_idx on public.fueling_entries(date desc);

-- Reminders (time-based or mileage-based)
drop table if exists public.reminders cascade;
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check (type in ('time', 'mileage')),
  due_date date,
  due_mileage integer,
  days_before integer,
  title text,
  notes text,
  status text not null default 'active' check (status in ('active', 'done')),
  channel_email boolean not null default true,
  channel_push boolean not null default true,
  enabled boolean not null default true,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reminders_due_check check (
    (type = 'time' and due_date is not null and due_mileage is null)
    or
    (type = 'mileage' and due_mileage is not null and due_date is null)
  )
);

drop index if exists public.reminders_vehicle_id_idx;
create index if not exists reminders_vehicle_id_idx on public.reminders(vehicle_id);

-- Photos (up to 6 photos per vehicle)
drop table if exists public.photos cascade;
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null default 'images' check (storage_bucket in ('images')),
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

drop index if exists public.photos_vehicle_id_idx;
create index if not exists photos_vehicle_id_idx on public.photos(vehicle_id);
drop index if exists public.photos_display_order_idx;
create index if not exists photos_display_order_idx on public.photos(vehicle_id, display_order);

-- Posts (generated marketplace listings, bilingual: { pl, en })
drop table if exists public.posts cascade;
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  platform text not null default 'generic' check (platform in ('olx', 'facebook', 'generic')),
  price numeric,
  content jsonb not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.posts_vehicle_id_idx;
create index if not exists posts_vehicle_id_idx on public.posts(vehicle_id);
drop index if exists public.posts_user_id_idx;
create index if not exists posts_user_id_idx on public.posts(user_id);
drop index if exists public.posts_created_at_idx;
create index if not exists posts_created_at_idx on public.posts(created_at desc);

-- Tires (per vehicle)
drop table if exists public.tires cascade;
create table if not exists public.tires (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  name text not null default '',
  width_mm integer not null,
  aspect_ratio integer not null,
  diameter_inch integer not null,
  tire_type text not null check (tire_type in (
    'summer', 'winter', 'all_season', 'run_flat', 'uhp', 'suv_xl'
  )),
  dot text,
  is_currently_fitted boolean not null default false,
  created_at timestamptz not null default now()
);

drop index if exists public.tires_vehicle_id_idx;
create index if not exists tires_vehicle_id_idx on public.tires(vehicle_id);
drop index if exists public.tires_is_currently_fitted_idx;
create index if not exists tires_is_currently_fitted_idx on public.tires(vehicle_id, is_currently_fitted) where is_currently_fitted = true;

-- Wheels / rims (per vehicle)
drop table if exists public.wheels cascade;
create table if not exists public.wheels (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  name text not null default '',
  width_inch numeric not null,
  diameter_inch integer not null,
  et_offset integer,
  bolt_pattern text,
  center_bore_mm numeric,
  bolt_type text,
  weight_kg numeric,
  is_currently_fitted boolean not null default false,
  created_at timestamptz not null default now()
);

drop index if exists public.wheels_vehicle_id_idx;
create index if not exists wheels_vehicle_id_idx on public.wheels(vehicle_id);
drop index if exists public.wheels_is_currently_fitted_idx;
create index if not exists wheels_is_currently_fitted_idx on public.wheels(vehicle_id, is_currently_fitted) where is_currently_fitted = true;

-- ================
-- Row Level Security (RLS)
-- ================

alter table public.vehicles enable row level security;
alter table public.workshops enable row level security;
alter table public.service_entries enable row level security;
alter table public.reports enable row level security;
alter table public.fueling_entries enable row level security;
alter table public.reminders enable row level security;
alter table public.photos enable row level security;
alter table public.posts enable row level security;
alter table public.tires enable row level security;
alter table public.wheels enable row level security;

-- Vehicles: owner can CRUD (authenticated only, no public access)
drop policy if exists vehicles_select_own on public.vehicles;
create policy vehicles_select_own
on public.vehicles for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists vehicles_insert_own on public.vehicles;
create policy vehicles_insert_own
on public.vehicles for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists vehicles_update_own on public.vehicles;
create policy vehicles_update_own
on public.vehicles for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists vehicles_delete_own on public.vehicles;
create policy vehicles_delete_own
on public.vehicles for delete
to authenticated
using (owner_id = auth.uid());

-- Workshops: owner can CRUD (per user)
drop policy if exists workshops_select_own on public.workshops;
create policy workshops_select_own on public.workshops for select to authenticated using (owner_id = auth.uid());

drop policy if exists workshops_insert_own on public.workshops;
create policy workshops_insert_own on public.workshops for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists workshops_update_own on public.workshops;
create policy workshops_update_own on public.workshops for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists workshops_delete_own on public.workshops;
create policy workshops_delete_own on public.workshops for delete to authenticated using (owner_id = auth.uid());

-- Service entries: allowed if the vehicle belongs to the user (authenticated only, no public access)
drop policy if exists service_entries_select_own_vehicle on public.service_entries;
create policy service_entries_select_own_vehicle
on public.service_entries for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = service_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists service_entries_insert_own_vehicle on public.service_entries;
create policy service_entries_insert_own_vehicle
on public.service_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = service_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists service_entries_update_own_vehicle on public.service_entries;
create policy service_entries_update_own_vehicle
on public.service_entries for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = service_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = service_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists service_entries_delete_own_vehicle on public.service_entries;
create policy service_entries_delete_own_vehicle
on public.service_entries for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = service_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Public reports: anon has no direct SELECT (use get_public_report_by_id RPC instead)
drop policy if exists reports_select_public on public.reports;

-- Public reports: authenticated users can read their own snapshots
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
on public.reports for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = reports.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Public reports: authenticated users can insert their own snapshots
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
on public.reports for insert
to authenticated
with check (
  exists (
    select 1
    from public.vehicles v
    where v.id = reports.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Update: authenticated can update title for their own reports
drop policy if exists reports_update_own on public.reports;
create policy reports_update_own
on public.reports for update
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = reports.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    where v.id = reports.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Fueling entries: allowed if vehicle belongs to user
drop policy if exists fueling_entries_select_own_vehicle on public.fueling_entries;
create policy fueling_entries_select_own_vehicle
on public.fueling_entries for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = fueling_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists fueling_entries_insert_own_vehicle on public.fueling_entries;
create policy fueling_entries_insert_own_vehicle
on public.fueling_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = fueling_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists fueling_entries_update_own_vehicle on public.fueling_entries;
create policy fueling_entries_update_own_vehicle
on public.fueling_entries for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = fueling_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = fueling_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists fueling_entries_delete_own_vehicle on public.fueling_entries;
create policy fueling_entries_delete_own_vehicle
on public.fueling_entries for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = fueling_entries.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Reminders: allowed if vehicle belongs to user
drop policy if exists reminders_select_own_vehicle on public.reminders;
create policy reminders_select_own_vehicle
on public.reminders for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = reminders.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists reminders_insert_own_vehicle on public.reminders;
create policy reminders_insert_own_vehicle
on public.reminders for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = reminders.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists reminders_update_own_vehicle on public.reminders;
create policy reminders_update_own_vehicle
on public.reminders for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = reminders.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = reminders.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists reminders_delete_own_vehicle on public.reminders;
create policy reminders_delete_own_vehicle
on public.reminders for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = reminders.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Vehicle photos: allowed if vehicle belongs to user (authenticated only, no public access)
drop policy if exists photos_select_own_vehicle on public.photos;
create policy photos_select_own_vehicle
on public.photos for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists photos_insert_own_vehicle on public.photos;
create policy photos_insert_own_vehicle
on public.photos for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists photos_update_own_vehicle on public.photos;
create policy photos_update_own_vehicle
on public.photos for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = photos.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists photos_delete_own_vehicle on public.photos;
create policy photos_delete_own_vehicle
on public.photos for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Vehicle tires: allowed if vehicle belongs to user
drop policy if exists tires_select_own_vehicle on public.tires;
create policy tires_select_own_vehicle on public.tires for select to authenticated
using (exists (select 1 from public.vehicles v where v.id = tires.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists tires_insert_own_vehicle on public.tires;
create policy tires_insert_own_vehicle on public.tires for insert to authenticated
with check (exists (select 1 from public.vehicles v where v.id = tires.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists tires_update_own_vehicle on public.tires;
create policy tires_update_own_vehicle on public.tires for update to authenticated
using (exists (select 1 from public.vehicles v where v.id = tires.vehicle_id and v.owner_id = auth.uid()))
with check (exists (select 1 from public.vehicles v where v.id = tires.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists tires_delete_own_vehicle on public.tires;
create policy tires_delete_own_vehicle on public.tires for delete to authenticated
using (exists (select 1 from public.vehicles v where v.id = tires.vehicle_id and v.owner_id = auth.uid()));

-- Vehicle wheels: allowed if vehicle belongs to user
drop policy if exists wheels_select_own_vehicle on public.wheels;
create policy wheels_select_own_vehicle on public.wheels for select to authenticated
using (exists (select 1 from public.vehicles v where v.id = wheels.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists wheels_insert_own_vehicle on public.wheels;
create policy wheels_insert_own_vehicle on public.wheels for insert to authenticated
with check (exists (select 1 from public.vehicles v where v.id = wheels.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists wheels_update_own_vehicle on public.wheels;
create policy wheels_update_own_vehicle on public.wheels for update to authenticated
using (exists (select 1 from public.vehicles v where v.id = wheels.vehicle_id and v.owner_id = auth.uid()))
with check (exists (select 1 from public.vehicles v where v.id = wheels.vehicle_id and v.owner_id = auth.uid()));

drop policy if exists wheels_delete_own_vehicle on public.wheels;
create policy wheels_delete_own_vehicle on public.wheels for delete to authenticated
using (exists (select 1 from public.vehicles v where v.id = wheels.vehicle_id and v.owner_id = auth.uid()));

-- Marketplace posts: owner can CRUD own posts
drop policy if exists posts_select_own on public.posts;
create policy posts_select_own
on public.posts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ================
-- Functions for public reports
-- ================

-- RPC: anon can fetch a single report by public_id only when report owner has active premium
drop function if exists public.get_public_report_by_id(text);
create or replace function public.get_public_report_by_id(p_public_id text)
returns setof public.reports
language sql
security definer
set search_path = public
as $$
  select r.*
  from public.reports r
  join public.vehicles v on v.id = r.vehicle_id
  join public.entitlements e on e.user_id = v.owner_id
  where r.public_id = p_public_id
    and (
      e.plan in ('premium', 'lifetime')
      or (e.premium_until is not null and e.premium_until > now())
    )
  limit 1;
$$;
grant execute on function public.get_public_report_by_id(text) to anon;
grant execute on function public.get_public_report_by_id(text) to authenticated;

-- Function to generate snapshot data
-- Legacy function for backward compatibility (uses all data)
drop function if exists public.generate_vehicle_snapshot(uuid);
create or replace function public.generate_vehicle_snapshot(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.generate_vehicle_snapshot_with_options(
    p_vehicle_id,
    '[]'::jsonb, -- selected_vehicle_photo_ids (empty = all)
    '[]'::jsonb, -- temp_photos_data (empty = none)
    jsonb_build_object(
      'include_service_entries', true,
      'include_notes', true,
      'include_fueling_stats', false,
      'include_service_stats', false
    ) -- report_options (default: include everything)
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.generate_vehicle_snapshot(uuid) to authenticated;

-- New function with options
drop function if exists public.generate_vehicle_snapshot_with_options(uuid, jsonb, jsonb, jsonb);
create or replace function public.generate_vehicle_snapshot_with_options(
  p_vehicle_id uuid,
  p_selected_vehicle_photo_ids jsonb, -- array of UUIDs, empty = all
  p_temp_photos_data jsonb, -- array of {storage_path, display_order}
  p_report_options jsonb -- {include_service_entries, include_notes, include_fueling_stats, include_service_stats, include_wheels_tires}
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_vehicle jsonb;
  v_service_entries jsonb;
  v_fueling_entries jsonb;
  v_vehicle_photos jsonb;
  v_temp_photos jsonb;
  v_vehicle_tires jsonb;
  v_vehicle_wheels jsonb;
  v_include_service_history boolean;
  v_include_service_stats boolean;
  v_include_notes boolean;
  v_include_insurance boolean;
  v_include_inspection boolean;
  v_include_wheels boolean;
  v_include_tires boolean;
  v_include_fueling_stats boolean;
  v_include_photos boolean;
begin
  -- Extract options (new format + backward compat with old keys)
  v_include_service_history := coalesce((p_report_options->>'include_service_history')::boolean, (p_report_options->>'include_service_entries')::boolean, false);
  v_include_service_stats := coalesce((p_report_options->>'include_service_stats')::boolean, false);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, false);
  v_include_insurance := coalesce((p_report_options->>'include_insurance')::boolean, true);
  v_include_inspection := coalesce((p_report_options->>'include_inspection')::boolean, true);
  v_include_wheels := coalesce((p_report_options->>'include_wheels')::boolean, (p_report_options->>'include_wheels_tires')::boolean, false);
  v_include_tires := coalesce((p_report_options->>'include_tires')::boolean, (p_report_options->>'include_wheels_tires')::boolean, false);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_include_photos := coalesce((p_report_options->>'include_photos')::boolean, true);

  -- Get vehicle data
  select to_jsonb(v.*) into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id;

  if v_vehicle is null then
    raise exception 'Vehicle not found: %', p_vehicle_id;
  end if;

  -- Strip optional vehicle fields when not included
  if not v_include_notes then
    v_vehicle := v_vehicle || jsonb_build_object('notes', null);
  end if;
  if not v_include_insurance then
    v_vehicle := v_vehicle || jsonb_build_object('insurance_valid_until', null);
  end if;
  if not v_include_inspection then
    v_vehicle := v_vehicle || jsonb_build_object('inspection_valid_until', null);
  end if;

  -- Get service entries (if included)
  if v_include_service_history or v_include_service_stats then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', se.id,
        'service_date', se.service_date,
        'mileage', se.mileage,
        'category', se.category,
        'title', se.title,
        'description', se.description,
        'cost', se.cost,
        'created_at', se.created_at
      ) order by se.service_date desc
    ), '[]'::jsonb) into v_service_entries
    from public.service_entries se
    where se.vehicle_id = p_vehicle_id;
  else
    v_service_entries := '[]'::jsonb;
  end if;

  -- Get fueling entries (if stats included)
  if v_include_fueling_stats then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', fe.id,
        'date', fe.date,
        'distance', fe.distance,
        'fuel_amount', fe.fuel_amount,
        'fuel_cost', fe.fuel_cost,
        'fuel_type', fe.fuel_type,
        'gas_station', fe.gas_station,
        'created_at', fe.created_at
      ) order by fe.date desc
    ), '[]'::jsonb) into v_fueling_entries
    from public.fueling_entries fe
    where fe.vehicle_id = p_vehicle_id;
  else
    v_fueling_entries := '[]'::jsonb;
  end if;

  -- Get vehicle tires and wheels (if included)
  if v_include_wheels or v_include_tires then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', vt.id,
        'vehicle_id', vt.vehicle_id,
        'name', vt.name,
        'width_mm', vt.width_mm,
        'aspect_ratio', vt.aspect_ratio,
        'diameter_inch', vt.diameter_inch,
        'tire_type', vt.tire_type,
        'dot', vt.dot,
        'is_currently_fitted', vt.is_currently_fitted,
        'created_at', vt.created_at
      ) order by vt.is_currently_fitted desc, vt.created_at desc
    ), '[]'::jsonb) into v_vehicle_tires
    from public.tires vt
    where vt.vehicle_id = p_vehicle_id;
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', vw.id,
        'vehicle_id', vw.vehicle_id,
        'name', vw.name,
        'width_inch', vw.width_inch,
        'diameter_inch', vw.diameter_inch,
        'et_offset', vw.et_offset,
        'bolt_pattern', vw.bolt_pattern,
        'center_bore_mm', vw.center_bore_mm,
        'bolt_type', vw.bolt_type,
        'weight_kg', vw.weight_kg,
        'is_currently_fitted', vw.is_currently_fitted,
        'created_at', vw.created_at
      ) order by vw.is_currently_fitted desc, vw.created_at desc
    ), '[]'::jsonb) into v_vehicle_wheels
    from public.wheels vw
    where vw.vehicle_id = p_vehicle_id;
  else
    v_vehicle_tires := '[]'::jsonb;
    v_vehicle_wheels := '[]'::jsonb;
  end if;

  -- Get selected vehicle photos (skip when include_photos is false)
  if v_include_photos and jsonb_array_length(p_selected_vehicle_photo_ids) > 0 then
    -- Only selected photos
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', vp.id,
        'storage_path', vp.storage_path,
        'storage_bucket', vp.storage_bucket,
        'source', 'vehicle',
        'display_order', vp.display_order,
        'created_at', vp.created_at
      ) order by vp.display_order, vp.created_at
    ), '[]'::jsonb) into v_vehicle_photos
    from public.photos vp
    where vp.vehicle_id = p_vehicle_id
      and vp.id::text = any(select jsonb_array_elements_text(p_selected_vehicle_photo_ids));
  elsif v_include_photos then
    -- All photos (backward compatibility when no selection)
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', vp.id,
        'storage_path', vp.storage_path,
        'storage_bucket', vp.storage_bucket,
        'source', 'vehicle',
        'display_order', vp.display_order,
        'created_at', vp.created_at
      ) order by vp.display_order, vp.created_at
    ), '[]'::jsonb) into v_vehicle_photos
    from public.photos vp
    where vp.vehicle_id = p_vehicle_id;
  else
    v_vehicle_photos := '[]'::jsonb;
  end if;

  -- Process temp photos (from report-photos bucket) - only when photos included
  if v_include_photos and jsonb_array_length(p_temp_photos_data) > 0 then
    v_temp_photos := jsonb_build_array();
    for i in 0..jsonb_array_length(p_temp_photos_data) - 1 loop
      v_temp_photos := v_temp_photos || jsonb_build_object(
        'id', gen_random_uuid()::text, -- Generate ID for temp photo
        'storage_path', p_temp_photos_data->i->>'storage_path',
        'storage_bucket', 'report-photos',
        'source', 'report-temp',
        'display_order', (p_temp_photos_data->i->>'display_order')::integer,
        'created_at', now()::text
      );
    end loop;
  else
    v_temp_photos := '[]'::jsonb;
  end if;

  -- Merge vehicle photos and temp photos (when include_photos, v_vehicle_photos and v_temp_photos already set above), sort by display_order
  v_vehicle_photos := (
    select coalesce(jsonb_agg(photo order by (photo->>'display_order')::integer), '[]'::jsonb)
    from (
      select jsonb_array_elements(v_vehicle_photos) as photo
      union all
      select jsonb_array_elements(v_temp_photos) as photo
    ) as all_photos
  );

  -- Build complete snapshot
  v_snapshot := jsonb_build_object(
    'vehicle', v_vehicle,
    'service_entries', v_service_entries,
    'fueling_entries', v_fueling_entries,
    'vehicle_photos', v_vehicle_photos,
    'vehicle_tires', v_vehicle_tires,
    'vehicle_wheels', v_vehicle_wheels,
    'report_options', p_report_options,
    'snapshot_version', '2.0',
    'snapshot_date', now()
  );

  return v_snapshot;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.generate_vehicle_snapshot_with_options(uuid, jsonb, jsonb, jsonb) to authenticated;

-- Legacy function for backward compatibility
drop function if exists public.create_report_snapshot(uuid);
create or replace function public.create_report_snapshot(p_vehicle_id uuid)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_report_snapshot_with_options(
    p_vehicle_id,
    '[]'::jsonb, -- selected_vehicle_photo_ids
    '[]'::jsonb, -- temp_photos_data
    jsonb_build_object(
      'include_service_entries', true,
      'include_notes', true,
      'include_fueling_stats', false,
      'include_service_stats', false,
      'include_wheels_tires', false
    ) -- report_options
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_report_snapshot(uuid) to authenticated;

-- New function with options
drop function if exists public.create_report_snapshot_with_options(uuid, jsonb, jsonb, jsonb);
create or replace function public.create_report_snapshot_with_options(
  p_vehicle_id uuid,
  p_selected_vehicle_photo_ids jsonb,
  p_temp_photos_data jsonb,
  p_report_options jsonb
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot public.reports;
  v_snapshot_data jsonb;
  v_snapshot_count integer;
  v_can_generate jsonb;
  v_photo_count integer;
begin
  -- Verify user owns the vehicle
  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  -- Check if user can generate a report (entitlements check)
  v_can_generate := public.can_generate_report();
  if not (v_can_generate->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_generate->>'reason', 'Cannot generate report');
  end if;

  -- Limit photos in report to 40 total (vehicle photos + temp photos)
  v_photo_count := jsonb_array_length(p_selected_vehicle_photo_ids) + jsonb_array_length(p_temp_photos_data);
  if v_photo_count > 40 then
    -- Trim to 40: keep all vehicle photos, then temp photos up to limit
    declare
      v_vehicle_count integer := jsonb_array_length(p_selected_vehicle_photo_ids);
      v_max_temp integer := greatest(0, 40 - v_vehicle_count);
    begin
      if jsonb_array_length(p_temp_photos_data) > v_max_temp then
        p_temp_photos_data := (
          select jsonb_agg(elem)
          from jsonb_array_elements(p_temp_photos_data) with ordinality as t(elem, idx)
          where idx <= v_max_temp
        );
      end if;
    end;
  end if;

  -- Check snapshot limit (3 per vehicle) - remove oldest if exceeded
  select count(*) into v_snapshot_count
  from public.reports
  where vehicle_id = p_vehicle_id;

  if v_snapshot_count >= 3 then
    -- Delete oldest snapshot
    delete from public.reports
    where id = (
      select id
      from public.reports
      where vehicle_id = p_vehicle_id
      order by created_at asc
      limit 1
    );
  end if;

  -- Generate snapshot with options
  v_snapshot_data := public.generate_vehicle_snapshot_with_options(
    p_vehicle_id,
    p_selected_vehicle_photo_ids,
    p_temp_photos_data,
    p_report_options
  );

  -- Create snapshot with public_id
  insert into public.reports (vehicle_id, snapshot_data)
  values (p_vehicle_id, v_snapshot_data)
  returning * into v_snapshot;

  -- Validate premium-only report access
  perform public.consume_report();

  return v_snapshot;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_report_snapshot_with_options(uuid, jsonb, jsonb, jsonb) to authenticated;

-- Update existing report snapshot with temp photos (called after upload to report-photos bucket)
-- Flow: 1) create report (temp_photos=[]), 2) upload temp photos, 3) call this to merge into snapshot
drop function if exists public.update_report_temp_photos(uuid, jsonb);
create or replace function public.update_report_temp_photos(
  p_report_id uuid,
  p_temp_photos_data jsonb
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports;
  v_snapshot_data jsonb;
  v_vehicle_photos jsonb;
  v_temp_photos jsonb;
  i integer;
begin
  -- Get report and verify ownership
  select * into v_report
  from public.reports
  where id = p_report_id;
  if v_report is null then
    raise exception 'Report not found';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = v_report.vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  if jsonb_array_length(p_temp_photos_data) = 0 then
    return v_report;
  end if;

  v_snapshot_data := v_report.snapshot_data;
  v_vehicle_photos := coalesce(v_snapshot_data->'vehicle_photos', '[]'::jsonb);

  -- Build temp photos with same structure as generate_vehicle_snapshot_with_options
  v_temp_photos := jsonb_build_array();
  for i in 0..jsonb_array_length(p_temp_photos_data) - 1 loop
    v_temp_photos := v_temp_photos || jsonb_build_object(
      'id', gen_random_uuid()::text,
      'storage_path', p_temp_photos_data->i->>'storage_path',
      'storage_bucket', 'report-photos',
      'source', 'report-temp',
      'display_order', (p_temp_photos_data->i->>'display_order')::integer,
      'created_at', now()::text
    );
  end loop;

  -- Merge and sort
  v_vehicle_photos := (
    select coalesce(jsonb_agg(photo order by (photo->>'display_order')::integer), '[]'::jsonb)
    from (
      select jsonb_array_elements(v_vehicle_photos) as photo
      union all
      select jsonb_array_elements(v_temp_photos) as photo
    ) as all_photos
  );

  v_snapshot_data := v_snapshot_data || jsonb_build_object('vehicle_photos', v_vehicle_photos);

  update public.reports
  set snapshot_data = v_snapshot_data
  where id = p_report_id
  returning * into v_report;

  return v_report;
end;
$$;

grant execute on function public.update_report_temp_photos(uuid, jsonb) to authenticated;

-- ================
-- Storage (buckets + policies)
-- ================
-- NOTE: Creating buckets is often easiest in the Dashboard (Storage → New bucket).
-- Buckets required by the app:
-- - images (must be PUBLIC) - vehicle photos only
-- - report-photos (must be PUBLIC) - temporary photos added only to reports
--
-- Vehico convention:
-- - Vehicle photos: <vehicle_id>/<...>
-- - Report photos: report-photos/<report_id>/<timestamp>-<randomId>.jpg
-- - Documents and attachments: stored locally on device
-- This lets us enforce storage access by checking vehicle ownership.
--
-- IMPORTANT: You may need to create these policies in the Dashboard if your project
-- restricts SQL access to the storage schema.

-- ================
-- Storage policies for 'images' bucket
-- ================

-- Read: authenticated can read images for vehicles they own
drop policy if exists "storage_images_read_vehicle_scoped" on storage.objects;
create policy "storage_images_read_vehicle_scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- Read: anon can read images bucket (public access for public reports)
-- Note: Bucket must be set to PUBLIC in Supabase Dashboard → Storage → Buckets → images → Edit → Public bucket
-- This allows Next.js app to display vehicle photos from snapshots
drop policy if exists "storage_images_read_public" on storage.objects;
create policy "storage_images_read_public"
on storage.objects for select
to anon
using (bucket_id = 'images');

-- Write: authenticated can write images only under vehicles they own
drop policy if exists "storage_images_write_vehicle_scoped" on storage.objects;
create policy "storage_images_write_vehicle_scoped"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- Update: authenticated can update images only under vehicles they own
drop policy if exists "storage_images_update_vehicle_scoped" on storage.objects;
create policy "storage_images_update_vehicle_scoped"
on storage.objects for update
to authenticated
using (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- Delete: authenticated can delete images only under vehicles they own
drop policy if exists "storage_images_delete_vehicle_scoped" on storage.objects;
create policy "storage_images_delete_vehicle_scoped"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- ================
-- Storage cleanup on row delete (prevents orphaned files)
-- ================
-- These triggers delete the underlying storage object when metadata rows are deleted.
-- (App code also attempts deletion; this is a safety net for GDPR-style hard deletes.)

create or replace function public.delete_storage_object(bucket text, path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = bucket
    and name = path;
end;
$$;

revoke all on function public.delete_storage_object(bucket text, path text) from public;

drop function if exists public.delete_storage_object_trigger();
create or replace function public.delete_storage_object_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  perform public.delete_storage_object(old.storage_bucket, old.storage_path);
  return old;
end;
$$;

revoke all on function public.delete_storage_object_trigger() from public;

drop trigger if exists photos_delete_storage on public.photos;
create trigger photos_delete_storage
after delete on public.photos
for each row execute function public.delete_storage_object_trigger();

-- ================
-- Storage policies for 'report-photos' bucket
-- ================
-- Note: Bucket must be set to PUBLIC in Supabase Dashboard → Storage → Buckets → report-photos → Edit → Public bucket
-- This allows Next.js app to display report photos from snapshots

-- Read: public access (anyone with link can view)
drop policy if exists "storage_report_photos_read_public" on storage.objects;
create policy "storage_report_photos_read_public"
on storage.objects for select
to anon
using (bucket_id = 'report-photos');

-- Read: authenticated can read report photos
drop policy if exists "storage_report_photos_read_authenticated" on storage.objects;
create policy "storage_report_photos_read_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'report-photos');

-- Write: authenticated can write report photos (for their own reports)
-- Reports are linked to vehicles, so we check vehicle ownership
drop policy if exists "storage_report_photos_write_authenticated" on storage.objects;
create policy "storage_report_photos_write_authenticated"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.reports pr
    join public.vehicles v on v.id = pr.vehicle_id
    where split_part(name, '/', 1) = pr.id::text
      and v.owner_id = auth.uid()
  )
);

-- Delete: authenticated can delete report photos (for their own reports)
drop policy if exists "storage_report_photos_delete_authenticated" on storage.objects;
create policy "storage_report_photos_delete_authenticated"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.reports pr
    join public.vehicles v on v.id = pr.vehicle_id
    where split_part(name, '/', 1) = pr.id::text
      and v.owner_id = auth.uid()
  )
);

-- ================
-- Entitlements (monetization)
-- ================

-- Entitlements table: user plan and feature limits
drop table if exists public.entitlements cascade;
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'lifetime')),
  vehicles_limit integer not null default 1 check (vehicles_limit > 0),
  photos_per_vehicle_limit integer not null default 6 check (photos_per_vehicle_limit > 0),
  tires_per_vehicle_limit integer not null default 1 check (tires_per_vehicle_limit > 0), -- 1 set (komplet) dla free, unlimited dla premium
  wheels_per_vehicle_limit integer not null default 1 check (wheels_per_vehicle_limit > 0), -- 1 set (komplet) dla free, unlimited dla premium
  workshops_limit integer not null default 3 check (workshops_limit > 0), -- 3 warsztaty dla free, unlimited dla premium
  reminders_limit integer not null default 5 check (reminders_limit > 0), -- 5 przypomnień dla free, unlimited dla premium
  premium_until timestamptz, -- null for free/lifetime, set for premium subscription
  product_id text, -- monthly, yearly, or lifetime when premium; null when free
  free_plan_vehicle_id uuid references public.vehicles(id) on delete set null, -- vehicle visible on free; set only on picker Save; cleared when premium
  downgraded_at timestamptz, -- when user downgraded to free; used for 90-day retention cleanup
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.entitlements_user_id_idx;
create index if not exists entitlements_user_id_idx on public.entitlements(user_id);
drop index if exists public.entitlements_free_plan_vehicle_id_idx;
create index if not exists entitlements_free_plan_vehicle_id_idx on public.entitlements(free_plan_vehicle_id) where free_plan_vehicle_id is not null;

-- RLS for entitlements
alter table public.entitlements enable row level security;

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
on public.entitlements for select
to authenticated
using (user_id = auth.uid());

drop policy if exists entitlements_update_own on public.entitlements;
create policy entitlements_update_own
on public.entitlements for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Trigger: initialize entitlements when user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (
    user_id,
    plan,
    vehicles_limit,
    photos_per_vehicle_limit,
    tires_per_vehicle_limit,
    wheels_per_vehicle_limit,
    workshops_limit,
    reminders_limit,
    premium_until,
    product_id
  ) values (
    new.id,
    'free',
    1, -- Free: 1 vehicle
    6, -- Free: 6 photos per vehicle
    1, -- Free: 1 set (komplet) opon per pojazd
    1, -- Free: 1 set (komplet) felg per pojazd
    3, -- Free: 3 warsztaty
    5, -- Free: 5 przypomnień
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================
-- RPC Functions for entitlements
-- ================

-- Check if user can generate a report
drop function if exists public.can_generate_report();
create or replace function public.can_generate_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_allowed boolean;
  v_reason text;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    -- Should not happen if trigger works, but handle gracefully
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  -- Premium/Lifetime: always allowed
  if v_entitlement.plan in ('premium', 'lifetime') then
    v_allowed := true;
    v_reason := null;
  -- Premium subscription: check premium_until
  elsif v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    v_allowed := true;
    v_reason := null;
  -- Free: not allowed (premium required)
  else
    v_allowed := false;
    v_reason := 'Premium plan required to generate reports.';
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_generate_report() to authenticated;

-- Check if user can generate a listing (marketplace post)
drop function if exists public.can_generate_listing();
create or replace function public.can_generate_listing()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_allowed boolean;
  v_reason text;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  -- Premium/Lifetime: always allowed
  if v_entitlement.plan in ('premium', 'lifetime') then
    v_allowed := true;
    v_reason := null;
  -- Premium subscription: check premium_until
  elsif v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    v_allowed := true;
    v_reason := null;
  -- Free: not allowed (premium required)
  else
    v_allowed := false;
    v_reason := 'Premium plan required to generate listings.';
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_generate_listing() to authenticated;

-- Consume one report (premium only)
drop function if exists public.consume_report();
create or replace function public.consume_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    raise exception 'Entitlements not found';
  end if;

  -- Premium/Lifetime: no consumption needed
  if v_entitlement.plan in ('premium', 'lifetime') then
    return;
  end if;

  -- Premium subscription: no consumption needed
  if v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    return;
  end if;

  raise exception 'Premium plan required to generate reports';
end;
$$;

grant execute on function public.consume_report() to authenticated;

-- Consume one listing (premium only)
drop function if exists public.consume_listing();
create or replace function public.consume_listing()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    raise exception 'Entitlements not found';
  end if;

  -- Premium/Lifetime: no consumption needed
  if v_entitlement.plan in ('premium', 'lifetime') then
    return;
  end if;

  -- Premium subscription: no consumption needed
  if v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    return;
  end if;

  raise exception 'Premium plan required to generate listings';
end;
$$;

grant execute on function public.consume_listing() to authenticated;

-- Create marketplace post with entitlement check
drop function if exists public.create_marketplace_post(uuid, text, numeric, jsonb);
create or replace function public.create_marketplace_post(
  p_vehicle_id uuid,
  p_platform text,
  p_price numeric,
  p_content jsonb
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts;
  v_can_generate jsonb;
begin
  -- Verify user owns the vehicle
  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  -- Check if user can generate a listing
  v_can_generate := public.can_generate_listing();
  if not (v_can_generate->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_generate->>'reason', 'Cannot generate listing');
  end if;

  -- Create post
  insert into public.posts (
    vehicle_id,
    user_id,
    platform,
    price,
    content,
    title
  ) values (
    p_vehicle_id,
    auth.uid(),
    p_platform,
    p_price,
    p_content,
    null
  )
  returning * into v_post;

  -- Validate premium-only listing access
  perform public.consume_listing();

  return v_post;
end;
$$;

grant execute on function public.create_marketplace_post(uuid, text, numeric, jsonb) to authenticated;

-- Check if user can create a vehicle (check vehicles_limit)
drop function if exists public.can_create_vehicle();
create or replace function public.can_create_vehicle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_vehicle_count integer;
  v_allowed boolean;
  v_reason text;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  -- Count user's vehicles
  select count(*) into v_vehicle_count
  from public.vehicles
  where owner_id = auth.uid();

  -- Premium/Lifetime: unlimited (vehicles_limit = 999)
  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  -- Free: check limit
  else
    v_allowed := (v_vehicle_count < v_entitlement.vehicles_limit);
    if not v_allowed then
      v_reason := format('Vehicle limit reached (%d). Upgrade to Premium for unlimited vehicles.', v_entitlement.vehicles_limit);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'vehicles_limit', v_entitlement.vehicles_limit,
    'vehicles_count', v_vehicle_count,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_create_vehicle() to authenticated;

-- Check if user can add a tire to vehicle (check tires_per_vehicle_limit)
drop function if exists public.can_add_tire(uuid);
create or replace function public.can_add_tire(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_tire_count integer;
  v_allowed boolean;
  v_reason text;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Vehicle not found or access denied'
    );
  end if;

  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  -- Count tires for this vehicle
  select count(*) into v_tire_count
  from public.tires
  where vehicle_id = p_vehicle_id;

  -- Premium/Lifetime: unlimited
  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  -- Free: check limit (1 set = komplet)
  else
    v_allowed := (v_tire_count < v_entitlement.tires_per_vehicle_limit);
    if not v_allowed then
      v_reason := format('Tire limit reached (%d set per vehicle). Upgrade to Premium for unlimited tires.', v_entitlement.tires_per_vehicle_limit);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'tires_limit', v_entitlement.tires_per_vehicle_limit,
    'tires_count', v_tire_count,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_add_tire(uuid) to authenticated;

-- Check if user can add a wheel to vehicle (check wheels_per_vehicle_limit)
drop function if exists public.can_add_wheel(uuid);
create or replace function public.can_add_wheel(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_wheel_count integer;
  v_allowed boolean;
  v_reason text;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Vehicle not found or access denied'
    );
  end if;

  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  -- Count wheels for this vehicle
  select count(*) into v_wheel_count
  from public.wheels
  where vehicle_id = p_vehicle_id;

  -- Premium/Lifetime: unlimited
  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  -- Free: check limit (1 set = komplet)
  else
    v_allowed := (v_wheel_count < v_entitlement.wheels_per_vehicle_limit);
    if not v_allowed then
      v_reason := format('Wheel limit reached (%d set per vehicle). Upgrade to Premium for unlimited wheels.', v_entitlement.wheels_per_vehicle_limit);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'wheels_limit', v_entitlement.wheels_per_vehicle_limit,
    'wheels_count', v_wheel_count,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_add_wheel(uuid) to authenticated;

-- Check if user can create a workshop (check workshops_limit)
drop function if exists public.can_create_workshop();
create or replace function public.can_create_workshop()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_workshop_count integer;
  v_allowed boolean;
  v_reason text;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  -- Count user's workshops
  select count(*) into v_workshop_count
  from public.workshops
  where owner_id = auth.uid();

  -- Premium/Lifetime: unlimited (workshops_limit = 999)
  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  -- Free: check limit
  else
    v_allowed := (v_workshop_count < v_entitlement.workshops_limit);
    if not v_allowed then
      v_reason := format('Workshop limit reached (%d). Upgrade to Premium for unlimited workshops.', v_entitlement.workshops_limit);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'workshops_limit', v_entitlement.workshops_limit,
    'workshops_count', v_workshop_count,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_create_workshop() to authenticated;

-- Check if user can create a reminder (check reminders_limit)
drop function if exists public.can_create_reminder();
create or replace function public.can_create_reminder()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_reminder_count integer;
  v_allowed boolean;
  v_reason text;
begin
  -- Get user entitlements
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  -- Count user's reminders (across all vehicles)
  select count(*) into v_reminder_count
  from public.reminders r
  join public.vehicles v on v.id = r.vehicle_id
  where v.owner_id = auth.uid();

  -- Premium/Lifetime: unlimited (reminders_limit = 999)
  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  -- Free: check limit
  else
    v_allowed := (v_reminder_count < v_entitlement.reminders_limit);
    if not v_allowed then
      v_reason := format('Reminder limit reached (%d). Upgrade to Premium for unlimited reminders.', v_entitlement.reminders_limit);
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'reminders_limit', v_entitlement.reminders_limit,
    'reminders_count', v_reminder_count,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_create_reminder() to authenticated;

-- Create vehicle with entitlement check
drop function if exists public.create_vehicle(
  text, text, text, integer, integer, integer, text, text, text, text, date, date
);
create or replace function public.create_vehicle(
  p_type text,
  p_vin text,
  p_make text,
  p_model text,
  p_production_year integer,
  p_mileage integer,
  p_engine_capacity integer,
  p_power_hp integer,
  p_fuel_type text,
  p_transmission text,
  p_drive_type text,
  p_notes text,
  p_insurance_valid_until date,
  p_inspection_valid_until date
)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
  v_can_create jsonb;
begin
  -- Check if user can create a vehicle
  v_can_create := public.can_create_vehicle();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create vehicle');
  end if;

  -- Create vehicle
  insert into public.vehicles (
    owner_id,
    type,
    vin,
    make,
    model,
    production_year,
    mileage,
    engine_capacity,
    power_hp,
    fuel_type,
    transmission,
    drive_type,
    notes,
    insurance_valid_until,
    inspection_valid_until
  ) values (
    auth.uid(),
    p_type,
    p_vin,
    p_make,
    p_model,
    p_production_year,
    p_mileage,
    p_engine_capacity,
    p_power_hp,
    p_fuel_type,
    p_transmission,
    p_drive_type,
    p_notes,
    p_insurance_valid_until,
    p_inspection_valid_until
  )
  returning * into v_vehicle;

  return v_vehicle;
end;
$$;

grant execute on function public.create_vehicle(text, text, text, integer, integer, integer, text, text, text, text, date, date) to authenticated;

-- Create tire with entitlement check
drop function if exists public.create_tire(uuid, text, integer, integer, integer, text, text, boolean);
create or replace function public.create_tire(
  p_vehicle_id uuid,
  p_name text,
  p_width_mm integer,
  p_aspect_ratio integer,
  p_diameter_inch integer,
  p_tire_type text,
  p_dot text,
  p_is_currently_fitted boolean
)
returns public.tires
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tire public.tires;
  v_can_add jsonb;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  -- Check if user can add a tire
  v_can_add := public.can_add_tire(p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add tire');
  end if;

  -- If setting as currently fitted, unset others
  if p_is_currently_fitted then
    update public.tires
    set is_currently_fitted = false
    where vehicle_id = p_vehicle_id;
  end if;

  -- Create tire
  insert into public.tires (
    vehicle_id,
    name,
    width_mm,
    aspect_ratio,
    diameter_inch,
    tire_type,
    dot,
    is_currently_fitted
  ) values (
    p_vehicle_id,
    p_name,
    p_width_mm,
    p_aspect_ratio,
    p_diameter_inch,
    p_tire_type,
    p_dot,
    p_is_currently_fitted
  )
  returning * into v_tire;

  return v_tire;
end;
$$;

grant execute on function public.create_tire(uuid, text, integer, integer, integer, text, text, boolean) to authenticated;

-- Create wheel with entitlement check
drop function if exists public.create_wheel(uuid, text, numeric, integer, integer, text, numeric, text, numeric, boolean);
create or replace function public.create_wheel(
  p_vehicle_id uuid,
  p_name text,
  p_width_inch numeric,
  p_diameter_inch integer,
  p_et_offset integer,
  p_bolt_pattern text,
  p_center_bore_mm numeric,
  p_bolt_type text,
  p_weight_kg numeric,
  p_is_currently_fitted boolean
)
returns public.wheels
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wheel public.wheels;
  v_can_add jsonb;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  -- Check if user can add a wheel
  v_can_add := public.can_add_wheel(p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add wheel');
  end if;

  -- If setting as currently fitted, unset others
  if p_is_currently_fitted then
    update public.wheels
    set is_currently_fitted = false
    where vehicle_id = p_vehicle_id;
  end if;

  -- Create wheel
  insert into public.wheels (
    vehicle_id,
    name,
    width_inch,
    diameter_inch,
    et_offset,
    bolt_pattern,
    center_bore_mm,
    bolt_type,
    weight_kg,
    is_currently_fitted
  ) values (
    p_vehicle_id,
    p_name,
    p_width_inch,
    p_diameter_inch,
    p_et_offset,
    p_bolt_pattern,
    p_center_bore_mm,
    p_bolt_type,
    p_weight_kg,
    p_is_currently_fitted
  )
  returning * into v_wheel;

  return v_wheel;
end;
$$;

grant execute on function public.create_wheel(uuid, text, numeric, integer, integer, text, numeric, text, numeric, boolean) to authenticated;

-- Create workshop with entitlement check
drop function if exists public.create_workshop(text, text, text, text);
create or replace function public.create_workshop(
  p_name text,
  p_workshop_type text,
  p_phone_number text,
  p_address text
)
returns public.workshops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop public.workshops;
  v_can_create jsonb;
begin
  -- Check if user can create a workshop
  v_can_create := public.can_create_workshop();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create workshop');
  end if;

  -- Create workshop
  insert into public.workshops (
    owner_id,
    name,
    workshop_type,
    phone_number,
    address
  ) values (
    auth.uid(),
    p_name,
    p_workshop_type,
    p_phone_number,
    p_address
  )
  returning * into v_workshop;

  return v_workshop;
end;
$$;

grant execute on function public.create_workshop(text, text, text, text) to authenticated;

-- Create reminder with entitlement check
drop function if exists public.create_reminder(uuid, text, date, integer, text);
create or replace function public.create_reminder(
  p_vehicle_id uuid,
  p_title text,
  p_due_date date,
  p_due_mileage integer,
  p_type text
)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminder public.reminders;
  v_can_create jsonb;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  -- Check if user can create a reminder
  v_can_create := public.can_create_reminder();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create reminder');
  end if;

  -- Create reminder
  insert into public.reminders (
    vehicle_id,
    title,
    due_date,
    due_mileage,
    type
  ) values (
    p_vehicle_id,
    p_title,
    p_due_date,
    p_due_mileage,
    p_type
  )
  returning * into v_reminder;

  return v_reminder;
end;
$$;

grant execute on function public.create_reminder(uuid, text, date, integer, text) to authenticated;
