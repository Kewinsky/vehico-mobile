-- Run this in Supabase Dashboard → SQL Editor to set up the database from scratch.

-- ================
-- Extensions
-- ================

create extension if not exists "pgcrypto";

-- ================
-- Tier defaults (single source in SQL; Edge mirrors in functions/_shared/entitlementLimits.ts)
-- ================

create or replace function public.internal_default_free_entitlement_limits()
returns table (
  vehicles_limit integer,
  photos_per_vehicle_limit integer,
  tires_per_vehicle_limit integer,
  wheels_per_vehicle_limit integer,
  workshops_limit integer,
  reminders_limit integer
)
language sql
stable
parallel safe
set search_path = public
as $$
  select 1, 6, 1, 1, 3, 5;
$$;

create or replace function public.internal_default_premium_entitlement_limits()
returns table (
  vehicles_limit integer,
  photos_per_vehicle_limit integer,
  tires_per_vehicle_limit integer,
  wheels_per_vehicle_limit integer,
  workshops_limit integer,
  reminders_limit integer
)
language sql
stable
parallel safe
set search_path = public
as $$
  select 999, 40, 999, 999, 999, 999;
$$;

-- ================
-- Tables
-- ================

-- Vehicles (cars + motorcycles)
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  type text not null check (type in ('car', 'motorcycle')),
  vin text,
  make text not null,
  model text not null,
  production_year integer not null,
  initial_mileage integer, -- mileage when the vehicle was first added
  mileage integer, -- current mileage in km
  mileage_updated_at date, -- calendar day when mileage was last set
  first_registration_date date, -- first registration date
  license_plate text, -- license plate number
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

create index vehicles_owner_id_idx on public.vehicles(owner_id);
create index vehicles_created_at_idx on public.vehicles(created_at desc);

-- Workshops (per user, not per vehicle)
create table public.workshops (
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

create index workshops_owner_id_idx on public.workshops(owner_id);

-- Service entries (timeline)
create table public.service_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_date date not null,
  mileage integer,
  category text not null default 'other' check (category in (
    'maintenance', 'repair', 'inspection', 'upgrade', 'oil_change', 'other'
  )),
  title text not null,
  description text not null default '',
  cost numeric,
  workshop_id uuid references public.workshops(id) on delete set null,
  workshop_snapshot text,
  created_at timestamptz not null default now()
);

create index service_entries_vehicle_id_idx on public.service_entries(vehicle_id);
create index service_entries_service_date_idx on public.service_entries(service_date desc);
create index service_entries_workshop_id_idx on public.service_entries(workshop_id);
alter table public.service_entries add column if not exists workshop_snapshot text;

-- Attachments and vehicle_documents are stored locally on device (SQLite + file system).
-- See: src/services/localStorage/

-- Reports (immutable snapshots for public reports)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  public_id text not null default replace(gen_random_uuid()::text, '-', ''),
  title text,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (public_id)
);

create index reports_vehicle_id_idx on public.reports(vehicle_id);
create index reports_public_id_idx on public.reports(public_id);
create index reports_created_at_idx on public.reports(created_at desc);

-- Fueling entries (lightweight)
create table public.fueling_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  distance numeric,
  fuel_amount numeric not null,
  fuel_cost numeric not null,
  fuel_type text check (fuel_type is null or fuel_type in ('95', '98', '100', 'on', 'lpg')),
  gas_station text check (gas_station is null or gas_station in ('orlen', 'bp', 'shell', 'circle_k', 'mol', 'moya', 'other')),
  created_at timestamptz not null default now()
);

create index fueling_entries_vehicle_id_idx on public.fueling_entries(vehicle_id);
create index fueling_entries_date_idx on public.fueling_entries(date desc);

-- Reminders (date and/or mileage; optional recurrence)
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
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
  -- Recurrence: time interval (value 1-31 days, 1-4 weeks, 1-12 months, 1-10 years)
  recurrence_interval_value integer,
  recurrence_interval_unit text check (recurrence_interval_unit is null or recurrence_interval_unit in ('days', 'weeks', 'months', 'years')),
  -- Recurrence: mileage interval (e.g. every 8000 km)
  recurrence_interval_km integer,
  recurrence_anchor_mileage integer,
  constraint reminders_due_check check (
    due_date is not null or due_mileage is not null
  )
);

create index reminders_vehicle_id_idx on public.reminders(vehicle_id);

-- Photos (up to 6 photos per vehicle)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null default 'images' check (storage_bucket in ('images')),
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index photos_vehicle_id_idx on public.photos(vehicle_id);
create index photos_display_order_idx on public.photos(vehicle_id, display_order);

-- Posts (generated marketplace listings, bilingual: { pl, en })
create table public.posts (
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

create index posts_vehicle_id_idx on public.posts(vehicle_id);
create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);

-- Tires (per vehicle)
create table public.tires (
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

create index tires_vehicle_id_idx on public.tires(vehicle_id);
create index tires_is_currently_fitted_idx on public.tires(vehicle_id, is_currently_fitted) where is_currently_fitted = true;

-- Wheels / rims (per vehicle)
create table public.wheels (
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

create index wheels_vehicle_id_idx on public.wheels(vehicle_id);
create index wheels_is_currently_fitted_idx on public.wheels(vehicle_id, is_currently_fitted) where is_currently_fitted = true;

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
create policy vehicles_select_own
on public.vehicles for select
to authenticated
using (owner_id = auth.uid());

-- NOTE: direct INSERT is disabled; use security definer RPC `public.create_vehicle(...)`.

create policy vehicles_update_own
on public.vehicles for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy vehicles_delete_own
on public.vehicles for delete
to authenticated
using (owner_id = auth.uid());

-- Workshops: owner can CRUD (per user)
create policy workshops_select_own
on public.workshops for select
to authenticated
using (owner_id = auth.uid());

-- NOTE: direct INSERT is disabled; use security definer RPC `public.create_workshop(...)`.

create policy workshops_update_own on public.workshops for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy workshops_delete_own on public.workshops for delete to authenticated using (owner_id = auth.uid());

-- Service entries: allowed if the vehicle belongs to the user (authenticated only, no public access)
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

-- Public reports: authenticated users can read their own snapshots
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

-- NOTE: direct INSERT is disabled; use security definer RPC `public.create_reminder(...)`.

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
create policy tires_select_own_vehicle
on public.tires for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = tires.vehicle_id and v.owner_id = auth.uid()
  )
);

-- NOTE: direct INSERT is disabled; use security definer RPC `public.create_tire(...)`.

create policy tires_update_own_vehicle
on public.tires for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = tires.vehicle_id and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = tires.vehicle_id and v.owner_id = auth.uid()
  )
);

create policy tires_delete_own_vehicle
on public.tires for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = tires.vehicle_id and v.owner_id = auth.uid()
  )
);

-- Vehicle wheels: allowed if vehicle belongs to user
create policy wheels_select_own_vehicle
on public.wheels for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = wheels.vehicle_id and v.owner_id = auth.uid()
  )
);

-- NOTE: direct INSERT is disabled; use security definer RPC `public.create_wheel(...)`.

create policy wheels_update_own_vehicle
on public.wheels for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = wheels.vehicle_id and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = wheels.vehicle_id and v.owner_id = auth.uid()
  )
);

create policy wheels_delete_own_vehicle
on public.wheels for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = wheels.vehicle_id and v.owner_id = auth.uid()
  )
);

-- Marketplace posts: owner can CRUD own posts
create policy posts_select_own
on public.posts for select
to authenticated
using (user_id = auth.uid());

create policy posts_insert_own
on public.posts for insert
to authenticated
with check (user_id = auth.uid());

create policy posts_update_own
on public.posts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ================
-- Entitlements (monetization)
-- ================

-- Entitlements table: user plan and feature limits
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'lifetime')),
  vehicles_limit integer not null default 1 check (vehicles_limit > 0),
  photos_per_vehicle_limit integer not null default 6 check (photos_per_vehicle_limit > 0),
  tires_per_vehicle_limit integer not null default 1 check (tires_per_vehicle_limit > 0), -- 1 set on free; unlimited on premium
  wheels_per_vehicle_limit integer not null default 1 check (wheels_per_vehicle_limit > 0), -- 1 set on free; unlimited on premium
  workshops_limit integer not null default 3 check (workshops_limit > 0), -- 3 workshops on free; unlimited on premium
  reminders_limit integer not null default 5 check (reminders_limit > 0), -- 5 reminders per vehicle on free; unlimited on premium
  premium_until timestamptz, -- null for free/lifetime, set for premium subscription
  product_id text, -- monthly, yearly, or lifetime when premium; null when free
  free_plan_vehicle_id uuid references public.vehicles(id) on delete set null, -- vehicle visible on free; auto-seeded on downgrade and changeable from picker; cleared when premium
  downgraded_at timestamptz, -- when user downgraded to free; used for 90-day retention cleanup
  -- Free plan: fixed set of visible IDs (oldest by created_at at downgrade); no auto-reveal on delete
  free_plan_workshop_ids uuid[] default '{}', -- up to 3; populated when plan goes free
  free_plan_reminder_ids uuid[] default '{}', -- up to 5 for free_plan_vehicle_id; status active first then others, then oldest created_at; recomputed on downgrade / set_free_plan_vehicle / reminder insert|delete|status change
  free_plan_tire_id uuid references public.tires(id) on delete set null, -- 1 set for free vehicle
  free_plan_wheel_id uuid references public.wheels(id) on delete set null, -- 1 set for free vehicle
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entitlements_user_id_idx on public.entitlements(user_id);
create index entitlements_free_plan_vehicle_id_idx on public.entitlements(free_plan_vehicle_id) where free_plan_vehicle_id is not null;

-- RLS for entitlements
alter table public.entitlements enable row level security;

create policy entitlements_select_own
on public.entitlements for select
to authenticated
using (user_id = auth.uid());

-- No client UPDATE: plan/limits are written by triggers, security definer RPCs, and Edge (service role).

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
  )
  select
    new.id,
    'free',
    l.vehicles_limit,
    l.photos_per_vehicle_limit,
    l.tires_per_vehicle_limit,
    l.wheels_per_vehicle_limit,
    l.workshops_limit,
    l.reminders_limit,
    null,
    null
  from public.internal_default_free_entitlement_limits() as l;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared: one fitted → that row; 2+ fitted → oldest created_at among fitted; none fitted → oldest overall.
create or replace function public._pick_free_plan_tire_or_wheel_id(
  p_vehicle_id uuid,
  p_kind text
)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_fitted_count int;
  v_id uuid;
begin
  if p_kind not in ('tire', 'wheel') then
    raise exception 'invalid p_kind: %', p_kind;
  end if;

  if p_kind = 'tire' then
    select count(*)::int into v_fitted_count
    from public.tires
    where vehicle_id = p_vehicle_id and is_currently_fitted = true;

    if v_fitted_count = 1 then
      select id into v_id from public.tires
      where vehicle_id = p_vehicle_id and is_currently_fitted = true
      limit 1;
      return v_id;
    elsif v_fitted_count >= 2 then
      select id into v_id from public.tires
      where vehicle_id = p_vehicle_id and is_currently_fitted = true
      order by created_at asc
      limit 1;
      return v_id;
    else
      select id into v_id from public.tires
      where vehicle_id = p_vehicle_id
      order by created_at asc
      limit 1;
      return v_id;
    end if;
  else
    select count(*)::int into v_fitted_count
    from public.wheels
    where vehicle_id = p_vehicle_id and is_currently_fitted = true;

    if v_fitted_count = 1 then
      select id into v_id from public.wheels
      where vehicle_id = p_vehicle_id and is_currently_fitted = true
      limit 1;
      return v_id;
    elsif v_fitted_count >= 2 then
      select id into v_id from public.wheels
      where vehicle_id = p_vehicle_id and is_currently_fitted = true
      order by created_at asc
      limit 1;
      return v_id;
    else
      select id into v_id from public.wheels
      where vehicle_id = p_vehicle_id
      order by created_at asc
      limit 1;
      return v_id;
    end if;
  end if;
end;
$$;

create or replace function public.pick_free_plan_tire_id_for_vehicle(p_vehicle_id uuid)
returns uuid
language sql
stable
parallel safe
set search_path = public
as $$
  select public._pick_free_plan_tire_or_wheel_id(p_vehicle_id, 'tire');
$$;

create or replace function public.pick_free_plan_wheel_id_for_vehicle(p_vehicle_id uuid)
returns uuid
language sql
stable
parallel safe
set search_path = public
as $$
  select public._pick_free_plan_tire_or_wheel_id(p_vehicle_id, 'wheel');
$$;

create or replace function public.entitlements_sync_free_plan_tire_ids_for_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.entitlements e
  set free_plan_tire_id = public.pick_free_plan_tire_id_for_vehicle(p_vehicle_id),
      updated_at = now()
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.owner_id = e.user_id
    and e.plan = 'free'
    and e.free_plan_vehicle_id is not distinct from p_vehicle_id;
end;
$$;

create or replace function public.entitlements_sync_free_plan_wheel_ids_for_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.entitlements e
  set free_plan_wheel_id = public.pick_free_plan_wheel_id_for_vehicle(p_vehicle_id),
      updated_at = now()
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.owner_id = e.user_id
    and e.plan = 'free'
    and e.free_plan_vehicle_id is not distinct from p_vehicle_id;
end;
$$;

-- `active` first, then any other status; within each bucket oldest created_at first (cap = free-tier reminders_limit).
create or replace function public.pick_free_plan_reminder_ids_for_vehicle(p_vehicle_id uuid)
returns uuid[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select coalesce(
           array_agg(id order by grp asc, created_at asc),
           '{}'::uuid[]
         )
    into v_ids
    from (
           select r.id,
                  r.created_at,
                  case when r.status = 'active' then 0 else 1 end as grp
           from public.reminders r
           where r.vehicle_id = p_vehicle_id
           order by grp asc, r.created_at asc
           limit (select reminders_limit from public.internal_default_free_entitlement_limits())
         ) picked;
  return v_ids;
end;
$$;

create or replace function public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(p_vehicle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  update public.entitlements e
  set free_plan_reminder_ids = public.pick_free_plan_reminder_ids_for_vehicle(p_vehicle_id),
      updated_at = now()
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.owner_id = e.user_id
    and e.plan = 'free';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- RPC: set free plan vehicle and populate reminders + tire/wheel IDs (tires/wheels: fitted-first, else oldest created_at)
create or replace function public.set_free_plan_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reminder_ids uuid[];
  v_tire_id uuid;
  v_wheel_id uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.vehicles where id = p_vehicle_id and owner_id = v_user_id) then
    raise exception 'Vehicle not found or access denied';
  end if;
  select public.pick_free_plan_reminder_ids_for_vehicle(p_vehicle_id) into v_reminder_ids;
  select public.pick_free_plan_tire_id_for_vehicle(p_vehicle_id) into v_tire_id;
  select public.pick_free_plan_wheel_id_for_vehicle(p_vehicle_id) into v_wheel_id;
  update public.entitlements
  set free_plan_vehicle_id = p_vehicle_id, free_plan_reminder_ids = coalesce(v_reminder_ids, '{}'),
      free_plan_tire_id = v_tire_id, free_plan_wheel_id = v_wheel_id, updated_at = now()
  where user_id = v_user_id
    and plan = 'free';
end;
$$;

grant execute on function public.set_free_plan_vehicle(uuid) to authenticated;

-- Triggers: remove from free-plan list on delete
create or replace function public.entitlements_remove_workshop_from_free_list()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.entitlements set free_plan_workshop_ids = array_remove(coalesce(free_plan_workshop_ids, '{}'), old.id), updated_at = now()
  where user_id = old.owner_id and old.id = any(coalesce(free_plan_workshop_ids, '{}'));
  return old;
end;
$$;
create trigger after_workshop_delete_entitlements after delete on public.workshops for each row execute function public.entitlements_remove_workshop_from_free_list();

create or replace function public.entitlements_remove_reminder_from_free_list()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(old.vehicle_id);
  return old;
end;
$$;
create trigger after_reminder_delete_entitlements after delete on public.reminders for each row execute function public.entitlements_remove_reminder_from_free_list();

create or replace function public.entitlements_refresh_free_plan_tire_after_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.entitlements_sync_free_plan_tire_ids_for_vehicle(old.vehicle_id);
  return old;
end;
$$;
create trigger after_tire_delete_entitlements after delete on public.tires for each row execute function public.entitlements_refresh_free_plan_tire_after_delete();

create or replace function public.entitlements_refresh_free_plan_wheel_after_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.entitlements_sync_free_plan_wheel_ids_for_vehicle(old.vehicle_id);
  return old;
end;
$$;
create trigger after_wheel_delete_entitlements after delete on public.wheels for each row execute function public.entitlements_refresh_free_plan_wheel_after_delete();

-- Triggers: append to free-plan list on insert when under limit
create or replace function public.entitlements_append_workshop_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_arr uuid[]; v_len int; v_lim int;
begin
  select e.plan, e.free_plan_workshop_ids, e.workshops_limit
    into v_plan, v_arr, v_lim
  from public.entitlements e where e.user_id = new.owner_id;
  if v_plan is null or v_plan not in ('free') then return new; end if;
  v_len := coalesce(array_length(v_arr, 1), 0);
  if v_len < v_lim then
    update public.entitlements set free_plan_workshop_ids = array_append(coalesce(free_plan_workshop_ids, '{}'), new.id), updated_at = now() where user_id = new.owner_id;
  end if;
  return new;
end;
$$;
create trigger after_workshop_insert_entitlements after insert on public.workshops for each row execute function public.entitlements_append_workshop_on_insert();

create or replace function public.entitlements_append_reminder_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_vehicle_id uuid;
begin
  select e.plan, e.free_plan_vehicle_id into v_plan, v_vehicle_id from public.entitlements e join public.vehicles v on v.owner_id = e.user_id where v.id = new.vehicle_id;
  if v_plan is null or v_plan not in ('free') or v_vehicle_id is distinct from new.vehicle_id then return new; end if;
  perform public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(new.vehicle_id);
  return new;
end;
$$;
create trigger after_reminder_insert_entitlements after insert on public.reminders for each row execute function public.entitlements_append_reminder_on_insert();

create or replace function public.entitlements_refresh_free_plan_reminders_after_reminder_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.vehicle_id is distinct from old.vehicle_id then
    perform public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(old.vehicle_id);
    perform public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(new.vehicle_id);
  else
    perform public.entitlements_recompute_free_plan_reminder_ids_for_vehicle(new.vehicle_id);
  end if;
  return new;
end;
$$;
create trigger after_reminder_update_entitlements
  after update of status, vehicle_id on public.reminders
  for each row execute function public.entitlements_refresh_free_plan_reminders_after_reminder_update();

create or replace function public.entitlements_set_free_tire_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_vehicle_id uuid;
begin
  select e.plan, e.free_plan_vehicle_id into v_plan, v_vehicle_id from public.entitlements e join public.vehicles v on v.owner_id = e.user_id where v.id = new.vehicle_id;
  if v_plan is null or v_plan not in ('free') or v_vehicle_id is distinct from new.vehicle_id then return new; end if;
  perform public.entitlements_sync_free_plan_tire_ids_for_vehicle(new.vehicle_id);
  return new;
end;
$$;
create trigger after_tire_insert_entitlements after insert on public.tires for each row execute function public.entitlements_set_free_tire_on_insert();

create or replace function public.entitlements_set_free_wheel_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_vehicle_id uuid;
begin
  select e.plan, e.free_plan_vehicle_id into v_plan, v_vehicle_id from public.entitlements e join public.vehicles v on v.owner_id = e.user_id where v.id = new.vehicle_id;
  if v_plan is null or v_plan not in ('free') or v_vehicle_id is distinct from new.vehicle_id then return new; end if;
  perform public.entitlements_sync_free_plan_wheel_ids_for_vehicle(new.vehicle_id);
  return new;
end;
$$;
create trigger after_wheel_insert_entitlements after insert on public.wheels for each row execute function public.entitlements_set_free_wheel_on_insert();

create or replace function public.entitlements_refresh_free_plan_tire_after_fitted_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_currently_fitted is not distinct from new.is_currently_fitted then return new; end if;
  perform public.entitlements_sync_free_plan_tire_ids_for_vehicle(new.vehicle_id);
  return new;
end;
$$;
create trigger after_tire_fitted_change_entitlements
  after update of is_currently_fitted on public.tires
  for each row execute function public.entitlements_refresh_free_plan_tire_after_fitted_change();

create or replace function public.entitlements_refresh_free_plan_wheel_after_fitted_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_currently_fitted is not distinct from new.is_currently_fitted then return new; end if;
  perform public.entitlements_sync_free_plan_wheel_ids_for_vehicle(new.vehicle_id);
  return new;
end;
$$;
create trigger after_wheel_fitted_change_entitlements
  after update of is_currently_fitted on public.wheels
  for each row execute function public.entitlements_refresh_free_plan_wheel_after_fitted_change();

-- ================
-- Functions for public reports
-- ================

-- RPC: anon can fetch a single report by public_id only when report owner has active premium
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


drop function if exists public.create_report_snapshot(uuid, jsonb, jsonb, jsonb);
drop function if exists public.generate_vehicle_snapshot(uuid, jsonb, jsonb, jsonb);
drop function if exists public.update_report_temp_photos(uuid, jsonb);

create or replace function public.generate_vehicle_snapshot(
  p_vehicle_id uuid,
  p_report_options jsonb
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
  v_avg_fueling numeric;
  v_vehicle_photos jsonb;
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
  v_distance_unit text := 'km';
  v_fuel_unit text := 'liters';
  v_currency text := 'PLN';
begin
  v_include_service_history := coalesce((p_report_options->>'include_service_history')::boolean, false);
  v_include_service_stats := coalesce((p_report_options->>'include_service_stats')::boolean, false);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, false);
  v_include_insurance := coalesce((p_report_options->>'include_insurance')::boolean, true);
  v_include_inspection := coalesce((p_report_options->>'include_inspection')::boolean, true);
  v_include_wheels := coalesce((p_report_options->>'include_wheels')::boolean, false);
  v_include_tires := coalesce((p_report_options->>'include_tires')::boolean, false);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_distance_unit := coalesce((p_report_options->>'distance_unit')::text, 'km');
  v_fuel_unit := coalesce((p_report_options->>'fuel_unit')::text, 'liters');
  v_currency := coalesce((p_report_options->>'currency')::text, 'PLN');

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

  -- Ready-to-display avg L/100 km (null when no usable tank data)
  if v_include_fueling_stats then
    select
      case
        when coalesce(sum(fe.distance), 0) > 0 then
          (coalesce(sum(fe.fuel_amount), 0) / sum(fe.distance)) * 100
        else null
      end
    into v_avg_fueling
    from public.fueling_entries fe
    where fe.vehicle_id = p_vehicle_id;
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

  v_vehicle_photos := '[]'::jsonb;

  -- Build complete snapshot
  v_snapshot := jsonb_build_object(
    'vehicle', v_vehicle,
    'service_entries', v_service_entries,
    'vehicle_photos', v_vehicle_photos,
    'vehicle_tires', v_vehicle_tires,
    'vehicle_wheels', v_vehicle_wheels,
    'units', jsonb_build_object(
      'distance_unit', v_distance_unit,
      'fuel_unit', v_fuel_unit,
      'currency', v_currency
    ),
    'report_options', p_report_options,
    'snapshot_version', '2.0',
    'snapshot_date', now()
  );

  if v_include_fueling_stats then
    v_snapshot := v_snapshot || jsonb_build_object(
      'fueling_stats',
      to_jsonb(v_avg_fueling)
    );
  end if;

  return v_snapshot;
end;
$$;

create or replace function public.create_report_snapshot(
  p_vehicle_id uuid,
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
  v_can_generate jsonb;
begin
  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_generate := public.check_premium_feature('report');
  if not (v_can_generate->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_generate->>'reason', 'Cannot generate report');
  end if;

  v_snapshot_data := public.generate_vehicle_snapshot(
    p_vehicle_id,
    p_report_options
  );

  insert into public.reports (vehicle_id, snapshot_data)
  values (p_vehicle_id, v_snapshot_data)
  returning * into v_snapshot;

  return v_snapshot;
end;
$$;

grant execute on function public.create_report_snapshot(uuid, jsonb) to authenticated;

create or replace function public.update_report_photos(
  p_report_id uuid,
  p_photos_data jsonb
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
  i integer;
begin
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

  if jsonb_array_length(p_photos_data) > 40 then
    raise exception 'Maximum 40 photos per report';
  end if;

  if jsonb_array_length(p_photos_data) = 0 then
    return v_report;
  end if;

  v_snapshot_data := v_report.snapshot_data;

  v_vehicle_photos := jsonb_build_array();
  for i in 0..jsonb_array_length(p_photos_data) - 1 loop
    v_vehicle_photos := v_vehicle_photos || jsonb_build_object(
      'id', gen_random_uuid()::text,
      'storage_path', p_photos_data->i->>'storage_path',
      'storage_bucket', 'report-photos',
      'display_order', (p_photos_data->i->>'display_order')::integer,
      'created_at', now()::text
    );
  end loop;

  v_snapshot_data := v_snapshot_data || jsonb_build_object('vehicle_photos', v_vehicle_photos);

  update public.reports
  set snapshot_data = v_snapshot_data
  where id = p_report_id
  returning * into v_report;

  return v_report;
end;
$$;

grant execute on function public.update_report_photos(uuid, jsonb) to authenticated;

-- ================
-- Storage (buckets + policies)
-- ================
-- NOTE: Creating buckets is often easiest in the Dashboard (Storage → New bucket).
-- Buckets required by the app:
-- - images (must be PUBLIC) - vehicle photos only
-- - report-photos (must be PUBLIC) - all photos embedded in public reports (copies + new picks)
--
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

create policy "storage_images_read_public"
on storage.objects for select
to anon
using (bucket_id = 'images');

-- Write: authenticated can write images only under vehicles they own
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
-- Storage cleanup on row delete
-- ================


-- ================
-- Storage policies for 'report-photos' bucket
-- ================
-- Note: Bucket must be set to PUBLIC in Supabase Dashboard → Storage → Buckets → report-photos → Edit → Public bucket
-- This allows Next.js app to display report photos from snapshots

-- Read: public access (anyone with link can view)
create policy "storage_report_photos_read_public"
on storage.objects for select
to anon
using (bucket_id = 'report-photos');

-- Read: authenticated can read report photos
create policy "storage_report_photos_read_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'report-photos');

-- Write: authenticated can write report photos (for their own reports)
-- Reports are linked to vehicles, so we check vehicle ownership
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
-- RPC Functions for entitlements (unified helpers, not exposed as RPC)
-- ================

create or replace function public.is_entitlement_premium_active(e public.entitlements)
returns boolean
language sql
stable
parallel safe
set search_path = public
as $$
  select e.plan in ('premium', 'lifetime')
    or (e.premium_until is not null and e.premium_until > now());
$$;

-- Single helper: premium-only feature (report, listing). Returns { allowed, reason, plan }.
create or replace function public.check_premium_feature(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_reason text;
begin
  select * into v_entitlement from public.entitlements where user_id = auth.uid();
  if v_entitlement is null then
    return jsonb_build_object('allowed', false, 'reason', 'Entitlements not found. Please contact support.', 'plan', null);
  end if;
  if public.is_entitlement_premium_active(v_entitlement) then
    return jsonb_build_object('allowed', true, 'reason', null, 'plan', v_entitlement.plan);
  end if;
  v_reason := case p_feature
    when 'report' then 'Premium plan required to generate reports.'
    when 'listing' then 'Premium plan required to generate listings.'
    else 'Premium required for this feature.'
  end;
  return jsonb_build_object('allowed', false, 'reason', v_reason, 'plan', v_entitlement.plan);
end;
$$;

-- Two overloads: `free_plan_reminder_ids` / `free_plan_workshop_ids` are uuid[];
-- `free_plan_tire_id`, `free_plan_wheel_id`, `free_plan_vehicle_id` are single uuid (nullable).
create or replace function public._free_plan_ids_length(ids uuid[])
returns integer language sql immutable as $$
  select coalesce(array_length(ids, 1), 0);
$$;
create or replace function public._free_plan_ids_length(ids uuid)
returns integer language sql immutable as $$
  select case when ids is null then 0 else 1 end;
$$;

-- Single helper: resource limit check. p_kind in ('vehicle','workshop','reminder','tire','wheel').
-- For reminder/tire/wheel, p_vehicle_id required (limit is per vehicle); verifies vehicle ownership.
create or replace function public.check_resource_limit(p_kind text, p_vehicle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.entitlements;
  v_count integer;
  v_limit integer;
  v_allowed boolean;
  v_reason text;
begin
  select * into v_entitlement from public.entitlements where user_id = auth.uid();
  if v_entitlement is null then
    return jsonb_build_object('allowed', false, 'reason', 'Entitlements not found. Please contact support.', 'plan', null);
  end if;

  if public.is_entitlement_premium_active(v_entitlement) then
    return jsonb_build_object('allowed', true, 'reason', null, 'plan', v_entitlement.plan);
  end if;

  case p_kind
    when 'vehicle' then
      select count(*) into v_count from public.vehicles where owner_id = auth.uid();
      v_limit := v_entitlement.vehicles_limit;
      v_reason := format('Vehicle limit reached (%s). Upgrade to Premium for unlimited vehicles.', v_limit);
    when 'workshop' then
      -- Free plan: limit by visible set (free_plan_workshop_ids), not total count
      v_count := public._free_plan_ids_length(v_entitlement.free_plan_workshop_ids);
      v_limit := v_entitlement.workshops_limit;
      v_reason := format('Workshop limit reached (%s). Upgrade to Premium for unlimited workshops.', v_limit);
    when 'reminder' then
      if p_vehicle_id is null then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = auth.uid()) then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      -- Free plan: only the free-plan vehicle can have reminders; limit by visible set (free_plan_reminder_ids)
      if v_entitlement.free_plan_vehicle_id is not null and v_entitlement.free_plan_vehicle_id <> p_vehicle_id then
        return jsonb_build_object('allowed', false, 'reason', 'Reminder limit reached. Upgrade to Premium for unlimited reminders.', 'plan', v_entitlement.plan);
      end if;
      v_count := public._free_plan_ids_length(v_entitlement.free_plan_reminder_ids);
      v_limit := v_entitlement.reminders_limit;
      v_reason := format('Reminder limit reached (%s per vehicle). Upgrade to Premium for unlimited reminders.', v_limit);
    when 'tire' then
      if p_vehicle_id is null then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = auth.uid()) then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      -- Free plan: only free-plan vehicle can have tires; one visible set; allow create only when slot is empty
      if v_entitlement.free_plan_vehicle_id is not null then
        if v_entitlement.free_plan_vehicle_id <> p_vehicle_id then
          return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
        end if;
        v_allowed := (v_entitlement.free_plan_tire_id is null);
        v_reason := format('Tire limit reached (%s set per vehicle). Upgrade to Premium for unlimited tires.', 1);
        return jsonb_build_object('allowed', v_allowed, 'reason', case when v_allowed then null else v_reason end, 'plan', v_entitlement.plan);
      end if;
      select count(*) into v_count from public.tires where vehicle_id = p_vehicle_id;
      v_limit := v_entitlement.tires_per_vehicle_limit;
      v_reason := format('Tire limit reached (%s set per vehicle). Upgrade to Premium for unlimited tires.', v_limit);
    when 'wheel' then
      if p_vehicle_id is null then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = auth.uid()) then
        return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
      end if;
      -- Free plan: only free-plan vehicle can have wheels; one visible set; allow create only when slot is empty
      if v_entitlement.free_plan_vehicle_id is not null then
        if v_entitlement.free_plan_vehicle_id <> p_vehicle_id then
          return jsonb_build_object('allowed', false, 'reason', 'Vehicle not found or access denied', 'plan', v_entitlement.plan);
        end if;
        v_allowed := (v_entitlement.free_plan_wheel_id is null);
        v_reason := format('Wheel limit reached (%s set per vehicle). Upgrade to Premium for unlimited wheels.', 1);
        return jsonb_build_object('allowed', v_allowed, 'reason', case when v_allowed then null else v_reason end, 'plan', v_entitlement.plan);
      end if;
      select count(*) into v_count from public.wheels where vehicle_id = p_vehicle_id;
      v_limit := v_entitlement.wheels_per_vehicle_limit;
      v_reason := format('Wheel limit reached (%s set per vehicle). Upgrade to Premium for unlimited wheels.', v_limit);
    else
      return jsonb_build_object('allowed', false, 'reason', 'Unknown resource kind', 'plan', v_entitlement.plan);
  end case;

  v_allowed := (v_count < v_limit);
  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', case when v_allowed then null else v_reason end,
    'plan', v_entitlement.plan
  );
end;
$$;

-- Create marketplace post with entitlement check
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
  v_can_generate := public.check_premium_feature('listing');
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

  return v_post;
end;
$$;

grant execute on function public.create_marketplace_post(uuid, text, numeric, jsonb) to authenticated;

-- Create vehicle with entitlement check
create or replace function public.create_vehicle(
  p_type text,
  p_vin text,
  p_make text,
  p_model text,
  p_production_year integer,
  p_mileage integer,
  p_first_registration_date date,
  p_license_plate text,
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
  v_can_create := public.check_resource_limit('vehicle', null);
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
    initial_mileage,
    mileage,
    mileage_updated_at,
    first_registration_date,
    license_plate,
    engine_capacity,
    power_hp,
    fuel_type,
    transmission,
    drive_type,
    notes,
    insurance_valid_until,
    inspection_valid_until,
    created_at
  ) values (
    auth.uid(),
    p_type,
    p_vin,
    p_make,
    p_model,
    p_production_year,
    p_mileage,
    p_mileage,
    case when p_mileage is not null then current_date else null end,
    p_first_registration_date,
    p_license_plate,
    p_engine_capacity,
    p_power_hp,
    p_fuel_type,
    p_transmission,
    p_drive_type,
    p_notes,
    p_insurance_valid_until,
    p_inspection_valid_until,
    now()
  )
  returning * into v_vehicle;

  return v_vehicle;
end;
$$;

grant execute on function public.create_vehicle(text, text, text, text, integer, integer, date, text, integer, integer, text, text, text, text, date, date) to authenticated;

-- Create tire with entitlement check
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
  v_fitted_count integer;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_add := public.check_resource_limit('tire', p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add tire');
  end if;

  -- App rule: allow up to 2 fitted sets at once
  if p_is_currently_fitted then
    select count(*) into v_fitted_count
    from public.tires
    where vehicle_id = p_vehicle_id and is_currently_fitted = true;
    if coalesce(v_fitted_count, 0) >= 2 then
      raise exception 'FITTED_TIRE_LIMIT_REACHED';
    end if;
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
  v_fitted_count integer;
begin
  -- Verify ownership
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_add := public.check_resource_limit('wheel', p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add wheel');
  end if;

  -- App rule: allow up to 2 fitted sets at once
  if p_is_currently_fitted then
    select count(*) into v_fitted_count
    from public.wheels
    where vehicle_id = p_vehicle_id and is_currently_fitted = true;
    if coalesce(v_fitted_count, 0) >= 2 then
      raise exception 'FITTED_WHEEL_LIMIT_REACHED';
    end if;
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
  v_can_create := public.check_resource_limit('workshop', null);
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

-- Create reminder with entitlement check (no type; date and/or mileage; optional recurrence)
create or replace function public.create_reminder(
  p_vehicle_id uuid,
  p_due_date date,
  p_due_mileage integer,
  p_days_before integer,
  p_title text,
  p_notes text,
  p_status text,
  p_channel_email boolean,
  p_channel_push boolean,
  p_enabled boolean,
  p_recurrence_interval_value integer default null,
  p_recurrence_interval_unit text default null,
  p_recurrence_interval_km integer default null,
  p_recurrence_anchor_mileage integer default null
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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  if p_due_date is null and p_due_mileage is null then
    raise exception 'At least one of due_date or due_mileage must be set';
  end if;

  v_can_create := public.check_resource_limit('reminder', p_vehicle_id);
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create reminder');
  end if;

  insert into public.reminders (
    vehicle_id,
    due_date,
    due_mileage,
    days_before,
    title,
    notes,
    status,
    channel_email,
    channel_push,
    enabled,
    recurrence_interval_value,
    recurrence_interval_unit,
    recurrence_interval_km,
    recurrence_anchor_mileage
  ) values (
    p_vehicle_id,
    p_due_date,
    p_due_mileage,
    p_days_before,
    p_title,
    p_notes,
    coalesce(p_status, 'active'),
    coalesce(p_channel_email, true),
    coalesce(p_channel_push, true),
    coalesce(p_enabled, true),
    p_recurrence_interval_value,
    p_recurrence_interval_unit,
    p_recurrence_interval_km,
    p_recurrence_anchor_mileage
  )
  returning * into v_reminder;

  return v_reminder;
end;
$$;

grant execute on function public.create_reminder(
  uuid, date, integer, integer, text, text, text, boolean, boolean, boolean, integer, text, integer, integer
) to authenticated;

-- ================
-- Table privileges for PostgREST roles
-- NOTE: RLS policies still decide which rows are accessible.
-- These grants prevent "permission denied for table ..." when RLS exists.
-- ================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant usage, select on sequences to authenticated;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to service_role;

-- ================
-- Entitlements table privileges (clients must not UPDATE plan/limits directly)
-- ================

revoke all on table public.entitlements from authenticated;
grant select on table public.entitlements to authenticated;
grant select, update on table public.entitlements to service_role;
