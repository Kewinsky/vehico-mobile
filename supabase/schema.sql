-- Vehico (MVP) schema for hosted Supabase
-- Run this in Supabase Dashboard → SQL Editor.

-- Extensions (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

-- ================
-- Tables
-- ================

-- Vehicles (cars + motorcycles)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  type text not null check (type in ('car', 'motorcycle')),
  title text not null,
  vin text,
  make text not null,
  model text not null,
  production_year integer not null,
  created_at timestamptz not null default now()
);

create index if not exists vehicles_owner_id_idx on public.vehicles(owner_id);
create index if not exists vehicles_created_at_idx on public.vehicles(created_at desc);

-- Service entries (timeline)
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

create index if not exists service_entries_vehicle_id_idx on public.service_entries(vehicle_id);
create index if not exists service_entries_service_date_idx on public.service_entries(service_date desc);

-- Attachments (receipts/invoices/photos) metadata
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  service_entry_id uuid not null references public.service_entries(id) on delete cascade,
  type text not null check (type in ('receipt', 'invoice', 'photo')),
  storage_bucket text not null check (storage_bucket in ('images', 'documents')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_service_entry_id_idx on public.attachments(service_entry_id);

-- Public pages (share link stub)
create table if not exists public.public_pages (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  public_id text not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  unique (public_id)
);

create index if not exists public_pages_vehicle_id_idx on public.public_pages(vehicle_id);

-- ==============================
-- Phase 2 tables (prompt_2)
-- ==============================

-- Fueling entries (lightweight)
create table if not exists public.fueling_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  distance numeric not null,
  fuel_amount numeric not null,
  fuel_cost numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists fueling_entries_vehicle_id_idx on public.fueling_entries(vehicle_id);
create index if not exists fueling_entries_date_idx on public.fueling_entries(date desc);

-- Reminders (time-based or mileage-based)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check (type in ('time', 'mileage')),
  due_date date,
  due_mileage integer,
  title text,
  notes text,
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

create index if not exists reminders_vehicle_id_idx on public.reminders(vehicle_id);

-- Backfill / migrate: note -> title (rename only if needed)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reminders'
      and column_name = 'note'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reminders'
      and column_name = 'title'
  ) then
    alter table public.reminders rename column note to title;
  end if;
end $$;

-- Ensure optional notes + title exist even if table already existed
alter table public.reminders
  add column if not exists title text;

alter table public.reminders
  add column if not exists notes text;

-- User settings (persist per user)
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

-- Vehicle photos (separate from service attachments)
create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null check (storage_bucket in ('images')),
  storage_path text not null,
  created_at timestamptz not null default now()
  -- hard delete only (no deleted_at)
);

create index if not exists vehicle_photos_vehicle_id_idx on public.vehicle_photos(vehicle_id);

-- Vehicle documents (not tied to service entries)
create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null check (storage_bucket in ('images', 'documents')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_documents_vehicle_id_idx on public.vehicle_documents(vehicle_id);
create index if not exists vehicle_documents_created_at_idx on public.vehicle_documents(created_at desc);

-- ================
-- Row Level Security (RLS)
-- ================

alter table public.vehicles enable row level security;
alter table public.service_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.public_pages enable row level security;
alter table public.fueling_entries enable row level security;
alter table public.reminders enable row level security;
alter table public.user_settings enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.vehicle_documents enable row level security;

-- Vehicles: owner can CRUD
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

-- Service entries: allowed if the vehicle belongs to the user
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

-- Public pages: only owner can create/read (public read can be added later)
drop policy if exists public_pages_select_own_vehicle on public.public_pages;
create policy public_pages_select_own_vehicle
on public.public_pages for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = public_pages.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists public_pages_insert_own_vehicle on public.public_pages;
create policy public_pages_insert_own_vehicle
on public.public_pages for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = public_pages.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists public_pages_delete_own_vehicle on public.public_pages;
create policy public_pages_delete_own_vehicle
on public.public_pages for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = public_pages.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Fueling entries: allowed if vehicle belongs to user (and not deleted)
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

-- Reminders: allowed if vehicle belongs to user (and not deleted)
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

-- Vehicle photos: allowed if vehicle belongs to user (and not deleted)
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

-- ================
-- Storage (buckets + policies)
-- ================
-- NOTE: Creating buckets is often easiest in the Dashboard (Storage → New bucket).
-- Buckets required by the app:
-- - images
-- - documents
--
-- Vehico convention:
-- - All uploaded objects are stored under a path that starts with the vehicle UUID:
--   <vehicle_id>/<...>
-- This lets us enforce storage access by checking vehicle ownership.
--
-- IMPORTANT: You may need to create these policies in the Dashboard if your project
-- restricts SQL access to the storage schema.
--
-- Read: authenticated can read objects for vehicles they own
drop policy if exists "storage_read_vehicle_scoped" on storage.objects;
create policy "storage_read_vehicle_scoped"
on storage.objects for select
to authenticated
using (
  bucket_id in ('images', 'documents')
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- Write: authenticated can write objects only under vehicles they own
drop policy if exists "storage_write_vehicle_scoped" on storage.objects;
create policy "storage_write_vehicle_scoped"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('images', 'documents')
  and exists (
    select 1
    from public.vehicles v
    where v.id::text = split_part(name, '/', 1)
      and v.owner_id = auth.uid()
  )
);

-- Delete: authenticated can delete objects only under vehicles they own
drop policy if exists "storage_delete_vehicle_scoped" on storage.objects;
create policy "storage_delete_vehicle_scoped"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('images', 'documents')
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

drop trigger if exists vehicle_photos_delete_storage on public.vehicle_photos;
create trigger vehicle_photos_delete_storage
after delete on public.vehicle_photos
for each row execute function public.delete_storage_object_trigger();

drop trigger if exists vehicle_documents_delete_storage on public.vehicle_documents;
create trigger vehicle_documents_delete_storage
after delete on public.vehicle_documents
for each row execute function public.delete_storage_object_trigger();

