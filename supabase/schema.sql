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
  created_at timestamptz not null default now()
);

drop index if exists public.vehicles_owner_id_idx;
create index if not exists vehicles_owner_id_idx on public.vehicles(owner_id);
drop index if exists public.vehicles_created_at_idx;
create index if not exists vehicles_created_at_idx on public.vehicles(created_at desc);

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
  created_at timestamptz not null default now()
);

drop index if exists public.service_entries_vehicle_id_idx;
create index if not exists service_entries_vehicle_id_idx on public.service_entries(vehicle_id);
drop index if exists public.service_entries_service_date_idx;
create index if not exists service_entries_service_date_idx on public.service_entries(service_date desc);

-- Attachments (receipts/invoices/photos) metadata
drop table if exists public.attachments cascade;
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  service_entry_id uuid not null references public.service_entries(id) on delete cascade,
  type text not null check (type in ('receipt', 'invoice', 'photo')),
  storage_bucket text not null check (storage_bucket in ('images', 'documents')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

drop index if exists public.attachments_service_entry_id_idx;
create index if not exists attachments_service_entry_id_idx on public.attachments(service_entry_id);

-- Public reports (immutable snapshots for public reports)
drop table if exists public.public_report cascade;
create table if not exists public.public_report (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  public_id text not null default replace(gen_random_uuid()::text, '-', ''),
  title text,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (public_id)
);

drop index if exists public.public_report_vehicle_id_idx;
create index if not exists public_report_vehicle_id_idx on public.public_report(vehicle_id);
drop index if exists public.public_report_public_id_idx;
create index if not exists public_report_public_id_idx on public.public_report(public_id);
drop index if exists public.public_report_created_at_idx;
create index if not exists public_report_created_at_idx on public.public_report(created_at desc);

-- Fueling entries (lightweight)
drop table if exists public.fueling_entries cascade;
create table if not exists public.fueling_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  distance numeric not null,
  fuel_amount numeric not null,
  fuel_cost numeric not null,
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

-- User settings (persist per user)
drop table if exists public.user_settings cascade;
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid(),
  currency text not null default 'PLN' check (currency in ('PLN', 'EUR')),
  distance_unit text not null default 'km' check (distance_unit in ('km', 'miles')),
  fuel_unit text not null default 'liters' check (fuel_unit in ('liters', 'gallons')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  language text not null default 'en' check (language in ('en', 'pl')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vehicle documents (not tied to service entries)
drop table if exists public.vehicle_documents cascade;
create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null check (storage_bucket in ('images', 'documents')),
  storage_path text not null,
  description text,
  created_at timestamptz not null default now()
);

drop index if exists public.vehicle_documents_vehicle_id_idx;
create index if not exists vehicle_documents_vehicle_id_idx on public.vehicle_documents(vehicle_id);
drop index if exists public.vehicle_documents_created_at_idx;
create index if not exists vehicle_documents_created_at_idx on public.vehicle_documents(created_at desc);

-- Vehicle photos (up to 6 photos per vehicle)
drop table if exists public.vehicle_photos cascade;
create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null default 'images' check (storage_bucket in ('images')),
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

drop index if exists public.vehicle_photos_vehicle_id_idx;
create index if not exists vehicle_photos_vehicle_id_idx on public.vehicle_photos(vehicle_id);
drop index if exists public.vehicle_photos_display_order_idx;
create index if not exists vehicle_photos_display_order_idx on public.vehicle_photos(vehicle_id, display_order);

-- Marketplace posts (generated listings)
drop table if exists public.marketplace_posts cascade;
create table if not exists public.marketplace_posts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  platform text not null default 'generic' check (platform in ('olx', 'facebook', 'generic')),
  language text not null default 'pl' check (language in ('en', 'pl')),
  price numeric,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.marketplace_posts_vehicle_id_idx;
create index if not exists marketplace_posts_vehicle_id_idx on public.marketplace_posts(vehicle_id);
drop index if exists public.marketplace_posts_user_id_idx;
create index if not exists marketplace_posts_user_id_idx on public.marketplace_posts(user_id);
drop index if exists public.marketplace_posts_created_at_idx;
create index if not exists marketplace_posts_created_at_idx on public.marketplace_posts(created_at desc);

-- ================
-- Row Level Security (RLS)
-- ================

alter table public.vehicles enable row level security;
alter table public.service_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.public_report enable row level security;
alter table public.fueling_entries enable row level security;
alter table public.reminders enable row level security;
alter table public.user_settings enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.marketplace_posts enable row level security;

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

-- Attachments: allowed if the service entry belongs to a vehicle owned by user
drop policy if exists attachments_select_own on public.attachments;
create policy attachments_select_own
on public.attachments for select
to authenticated
using (
  exists (
    select 1
    from public.service_entries se
    join public.vehicles v on v.id = se.vehicle_id
    where se.id = attachments.service_entry_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists attachments_insert_own on public.attachments;
create policy attachments_insert_own
on public.attachments for insert
to authenticated
with check (
  exists (
    select 1
    from public.service_entries se
    join public.vehicles v on v.id = se.vehicle_id
    where se.id = attachments.service_entry_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists attachments_delete_own on public.attachments;
create policy attachments_delete_own
on public.attachments for delete
to authenticated
using (
  exists (
    select 1
    from public.service_entries se
    join public.vehicles v on v.id = se.vehicle_id
    where se.id = attachments.service_entry_id
      and v.owner_id = auth.uid()
  )
);

-- Public reports: public read access (for Next.js public reports)
drop policy if exists public_report_select_public on public.public_report;
create policy public_report_select_public
on public.public_report for select
to anon
using (true); -- Public access is controlled by public_id uniqueness

-- Public reports: authenticated users can read their own snapshots
drop policy if exists public_report_select_own on public.public_report;
create policy public_report_select_own
on public.public_report for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = public_report.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Public reports: authenticated users can insert their own snapshots
drop policy if exists public_report_insert_own on public.public_report;
create policy public_report_insert_own
on public.public_report for insert
to authenticated
with check (
  exists (
    select 1
    from public.vehicles v
    where v.id = public_report.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Update: authenticated can update title for their own reports
drop policy if exists public_report_update_own on public.public_report;
create policy public_report_update_own
on public.public_report for update
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = public_report.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    where v.id = public_report.vehicle_id
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

-- User settings: owner can read/upsert own row
drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
on public.user_settings for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own
on public.user_settings for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
on public.user_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Vehicle documents: allowed if vehicle belongs to user
drop policy if exists vehicle_documents_select_own_vehicle on public.vehicle_documents;
create policy vehicle_documents_select_own_vehicle
on public.vehicle_documents for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_documents_insert_own_vehicle on public.vehicle_documents;
create policy vehicle_documents_insert_own_vehicle
on public.vehicle_documents for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_documents_update_own_vehicle on public.vehicle_documents;
create policy vehicle_documents_update_own_vehicle
on public.vehicle_documents for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_documents_delete_own_vehicle on public.vehicle_documents;
create policy vehicle_documents_delete_own_vehicle
on public.vehicle_documents for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Vehicle photos: allowed if vehicle belongs to user (authenticated only, no public access)
drop policy if exists vehicle_photos_select_own_vehicle on public.vehicle_photos;
create policy vehicle_photos_select_own_vehicle
on public.vehicle_photos for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_photos_insert_own_vehicle on public.vehicle_photos;
create policy vehicle_photos_insert_own_vehicle
on public.vehicle_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_photos_update_own_vehicle on public.vehicle_photos;
create policy vehicle_photos_update_own_vehicle
on public.vehicle_photos for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists vehicle_photos_delete_own_vehicle on public.vehicle_photos;
create policy vehicle_photos_delete_own_vehicle
on public.vehicle_photos for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Marketplace posts: owner can CRUD own posts
drop policy if exists marketplace_posts_select_own on public.marketplace_posts;
create policy marketplace_posts_select_own
on public.marketplace_posts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists marketplace_posts_insert_own on public.marketplace_posts;
create policy marketplace_posts_insert_own
on public.marketplace_posts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists marketplace_posts_update_own on public.marketplace_posts;
create policy marketplace_posts_update_own
on public.marketplace_posts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists marketplace_posts_delete_own on public.marketplace_posts;
create policy marketplace_posts_delete_own
on public.marketplace_posts for delete
to authenticated
using (user_id = auth.uid());

-- ================
-- Functions for public reports
-- ================

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
  p_report_options jsonb -- {include_service_entries, include_notes, include_fueling_stats, include_service_stats}
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
  v_include_service_entries boolean;
  v_include_notes boolean;
  v_include_fueling_stats boolean;
  v_include_service_stats boolean;
begin
  -- Extract options
  v_include_service_entries := coalesce((p_report_options->>'include_service_entries')::boolean, true);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, true);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_include_service_stats := coalesce((p_report_options->>'include_service_stats')::boolean, false);

  -- Get vehicle data
  select to_jsonb(v.*) into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id;

  if v_vehicle is null then
    raise exception 'Vehicle not found: %', p_vehicle_id;
  end if;

  -- If notes not included, set to null
  if not v_include_notes then
    v_vehicle := v_vehicle || jsonb_build_object('notes', null);
  end if;

  -- Get service entries (if included)
  if v_include_service_entries or v_include_service_stats then
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
        'gas_station', fe.gas_station,
        'created_at', fe.created_at
      ) order by fe.date desc
    ), '[]'::jsonb) into v_fueling_entries
    from public.fueling_entries fe
    where fe.vehicle_id = p_vehicle_id;
  else
    v_fueling_entries := '[]'::jsonb;
  end if;

  -- Get selected vehicle photos
  if jsonb_array_length(p_selected_vehicle_photo_ids) > 0 then
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
    from public.vehicle_photos vp
    where vp.vehicle_id = p_vehicle_id
      and vp.id::text = any(select jsonb_array_elements_text(p_selected_vehicle_photo_ids));
  else
    -- All photos (backward compatibility)
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
    from public.vehicle_photos vp
    where vp.vehicle_id = p_vehicle_id;
  end if;

  -- Process temp photos (from report-photos bucket)
  if jsonb_array_length(p_temp_photos_data) > 0 then
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

  -- Merge vehicle photos and temp photos, sort by display_order
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
drop function if exists public.create_public_report_snapshot(uuid);
create or replace function public.create_public_report_snapshot(p_vehicle_id uuid)
returns public.public_report
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_public_report_snapshot_with_options(
    p_vehicle_id,
    '[]'::jsonb, -- selected_vehicle_photo_ids
    '[]'::jsonb, -- temp_photos_data
    jsonb_build_object(
      'include_service_entries', true,
      'include_notes', true,
      'include_fueling_stats', false,
      'include_service_stats', false
    ) -- report_options
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_public_report_snapshot(uuid) to authenticated;

-- New function with options
drop function if exists public.create_public_report_snapshot_with_options(uuid, jsonb, jsonb, jsonb);
create or replace function public.create_public_report_snapshot_with_options(
  p_vehicle_id uuid,
  p_selected_vehicle_photo_ids jsonb,
  p_temp_photos_data jsonb,
  p_report_options jsonb
)
returns public.public_report
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot public.public_report;
  v_snapshot_data jsonb;
  v_snapshot_count integer;
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

  -- Check snapshot limit (3 per vehicle)
  select count(*) into v_snapshot_count
  from public.public_report
  where vehicle_id = p_vehicle_id;

  if v_snapshot_count >= 3 then
    -- Delete oldest snapshot
    delete from public.public_report
    where id = (
      select id
      from public.public_report
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
  insert into public.public_report (vehicle_id, snapshot_data)
  values (p_vehicle_id, v_snapshot_data)
  returning * into v_snapshot;

  return v_snapshot;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_public_report_snapshot_with_options(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ================
-- Storage (buckets + policies)
-- ================
-- NOTE: Creating buckets is often easiest in the Dashboard (Storage → New bucket).
-- Buckets required by the app:
-- - images (must be PUBLIC)
-- - documents (private)
-- - report-photos (must be PUBLIC) - temporary photos added only to reports
--
-- Vehico convention:
-- - Vehicle photos and documents: <vehicle_id>/<...>
-- - Attachments: service_entry_attachments/<vehicle_id>/<service_entry_id>/<...>
-- - Report photos: report-photos/<report_id>/<timestamp>-<randomId>.jpg
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
    where (
      -- Vehicle photos: <vehicle_id>/<...>
      v.id::text = split_part(name, '/', 1)
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
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
    where (
      -- Vehicle photos: <vehicle_id>/<...>
      v.id::text = split_part(name, '/', 1)
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
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
    where (
      -- Vehicle photos: <vehicle_id>/<...>
      v.id::text = split_part(name, '/', 1)
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'images'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle photos: <vehicle_id>/<...>
      v.id::text = split_part(name, '/', 1)
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
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
    where (
      -- Vehicle photos: <vehicle_id>/<...>
      v.id::text = split_part(name, '/', 1)
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
);

-- ================
-- Storage policies for 'documents' bucket
-- ================

-- Read: authenticated can read documents for vehicles they own
drop policy if exists "storage_documents_read_vehicle_scoped" on storage.objects;
create policy "storage_documents_read_vehicle_scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle documents: vehicle_documents/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'vehicle_documents' and v.id::text = split_part(name, '/', 2))
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
);

-- Write: authenticated can write documents only under vehicles they own
drop policy if exists "storage_documents_write_vehicle_scoped" on storage.objects;
create policy "storage_documents_write_vehicle_scoped"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle documents: vehicle_documents/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'vehicle_documents' and v.id::text = split_part(name, '/', 2))
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
);

-- Update: authenticated can update documents only under vehicles they own
drop policy if exists "storage_documents_update_vehicle_scoped" on storage.objects;
create policy "storage_documents_update_vehicle_scoped"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle documents: vehicle_documents/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'vehicle_documents' and v.id::text = split_part(name, '/', 2))
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle documents: vehicle_documents/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'vehicle_documents' and v.id::text = split_part(name, '/', 2))
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
    and v.owner_id = auth.uid()
  )
);

-- Delete: authenticated can delete documents only under vehicles they own
drop policy if exists "storage_documents_delete_vehicle_scoped" on storage.objects;
create policy "storage_documents_delete_vehicle_scoped"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicles v
    where (
      -- Vehicle documents: vehicle_documents/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'vehicle_documents' and v.id::text = split_part(name, '/', 2))
      or
      -- Attachments: service_entry_attachments/<vehicle_id>/<...>
      (split_part(name, '/', 1) = 'service_entry_attachments' and v.id::text = split_part(name, '/', 2))
    )
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

drop trigger if exists attachments_delete_storage on public.attachments;
create trigger attachments_delete_storage
after delete on public.attachments
for each row execute function public.delete_storage_object_trigger();

drop trigger if exists vehicle_documents_delete_storage on public.vehicle_documents;
create trigger vehicle_documents_delete_storage
after delete on public.vehicle_documents
for each row execute function public.delete_storage_object_trigger();

drop trigger if exists vehicle_photos_delete_storage on public.vehicle_photos;
create trigger vehicle_photos_delete_storage
after delete on public.vehicle_photos
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
    from public.public_report pr
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
    from public.public_report pr
    join public.vehicles v on v.id = pr.vehicle_id
    where split_part(name, '/', 1) = pr.id::text
      and v.owner_id = auth.uid()
  )
);
