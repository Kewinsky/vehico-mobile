-- Migration: Add entitlements system for monetization
-- Date: 2025-02-06
-- Description: Adds entitlements table, RPC functions for checking limits, and modifies report creation to use entitlements

-- ================
-- Entitlements Table
-- ================

-- Entitlements table: user plan, limits, and remaining credits
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'lifetime')),
  reports_remaining integer not null default 0 check (reports_remaining >= 0),
  listings_remaining integer not null default 0 check (listings_remaining >= 0),
  vehicles_limit integer not null default 1 check (vehicles_limit > 0),
  photos_per_vehicle_limit integer not null default 6 check (photos_per_vehicle_limit > 0),
  tires_per_vehicle_limit integer not null default 1 check (tires_per_vehicle_limit > 0),
  wheels_per_vehicle_limit integer not null default 1 check (wheels_per_vehicle_limit > 0),
  workshops_limit integer not null default 3 check (workshops_limit > 0),
  reminders_limit integer not null default 5 check (reminders_limit > 0),
  premium_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entitlements_user_id_idx on public.entitlements(user_id);

-- RLS for entitlements
alter table public.entitlements enable row level security;

-- Policies may already exist if you ran test_part1..4 before this migration.
-- Drop first to keep migration idempotent.
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

-- ================
-- Trigger: Initialize entitlements for new users
-- ================

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
    reports_remaining,
    listings_remaining,
    vehicles_limit,
    photos_per_vehicle_limit,
    tires_per_vehicle_limit,
    wheels_per_vehicle_limit,
    workshops_limit,
    reminders_limit,
    premium_until
  ) values (
    new.id,
    'free',
    0,
    0,
    1,
    6,
    1,
    1,
    3,
    5,
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
-- RPC Functions: Check entitlements
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  if v_entitlement.plan in ('premium', 'lifetime') then
    v_allowed := true;
    v_reason := null;
  elsif v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_entitlement.reports_remaining > 0);
    if not v_allowed then
      v_reason := 'No remaining reports. Purchase a pack or upgrade to Premium.';
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'reports_remaining', v_entitlement.reports_remaining,
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  if v_entitlement.plan in ('premium', 'lifetime') then
    v_allowed := true;
    v_reason := null;
  elsif v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_entitlement.listings_remaining > 0);
    if not v_allowed then
      v_reason := 'No remaining listings. Purchase a pack or upgrade to Premium.';
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'listings_remaining', v_entitlement.listings_remaining,
    'plan', v_entitlement.plan
  );
end;
$$;

grant execute on function public.can_generate_listing() to authenticated;

-- Consume one report (decrease reports_remaining for free users)
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    raise exception 'Entitlements not found';
  end if;

  if v_entitlement.plan in ('premium', 'lifetime') then
    return;
  end if;

  if v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    return;
  end if;

  if v_entitlement.reports_remaining <= 0 then
    raise exception 'No remaining reports';
  end if;

  update public.entitlements
  set reports_remaining = reports_remaining - 1,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

grant execute on function public.consume_report() to authenticated;

-- Consume one listing (decrease listings_remaining for free users)
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    raise exception 'Entitlements not found';
  end if;

  if v_entitlement.plan in ('premium', 'lifetime') then
    return;
  end if;

  if v_entitlement.premium_until is not null and v_entitlement.premium_until > now() then
    return;
  end if;

  if v_entitlement.listings_remaining <= 0 then
    raise exception 'No remaining listings';
  end if;

  update public.entitlements
  set listings_remaining = listings_remaining - 1,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

grant execute on function public.consume_listing() to authenticated;

-- Check if user can create a vehicle
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found. Please contact support.'
    );
  end if;

  select count(*) into v_vehicle_count
  from public.vehicles
  where owner_id = auth.uid();

  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_vehicle_count < v_entitlement.vehicles_limit);
    if not v_allowed then
      v_reason := format('Vehicle limit reached (%s). Upgrade to Premium for unlimited vehicles.', v_entitlement.vehicles_limit);
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

-- Check if user can add a tire to vehicle
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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Vehicle not found or access denied'
    );
  end if;

  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  select count(*) into v_tire_count
  from public.tires
  where vehicle_id = p_vehicle_id;

  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_tire_count < v_entitlement.tires_per_vehicle_limit);
    if not v_allowed then
      v_reason := format('Tire limit reached (%s set per vehicle). Upgrade to Premium for unlimited tires.', v_entitlement.tires_per_vehicle_limit);
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

-- Check if user can add a wheel to vehicle
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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Vehicle not found or access denied'
    );
  end if;

  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  select count(*) into v_wheel_count
  from public.wheels
  where vehicle_id = p_vehicle_id;

  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_wheel_count < v_entitlement.wheels_per_vehicle_limit);
    if not v_allowed then
      v_reason := format('Wheel limit reached (%s set per vehicle). Upgrade to Premium for unlimited wheels.', v_entitlement.wheels_per_vehicle_limit);
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

-- Check if user can create a workshop
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  select count(*) into v_workshop_count
  from public.workshops
  where owner_id = auth.uid();

  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_workshop_count < v_entitlement.workshops_limit);
    if not v_allowed then
      v_reason := format('Workshop limit reached (%s). Upgrade to Premium for unlimited workshops.', v_entitlement.workshops_limit);
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

-- Check if user can create a reminder
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
  select * into v_entitlement
  from public.entitlements
  where user_id = auth.uid();

  if v_entitlement is null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'Entitlements not found'
    );
  end if;

  select count(*) into v_reminder_count
  from public.reminders r
  join public.vehicles v on v.id = r.vehicle_id
  where v.owner_id = auth.uid();

  if v_entitlement.plan in ('premium', 'lifetime') or 
     (v_entitlement.premium_until is not null and v_entitlement.premium_until > now()) then
    v_allowed := true;
    v_reason := null;
  else
    v_allowed := (v_reminder_count < v_entitlement.reminders_limit);
    if not v_allowed then
      v_reason := format('Reminder limit reached (%s). Upgrade to Premium for unlimited reminders.', v_entitlement.reminders_limit);
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

-- ================
-- RPC Functions: Create resources with entitlement checks
-- ================

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
  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_generate := public.can_generate_listing();
  if not (v_can_generate->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_generate->>'reason', 'Cannot generate listing');
  end if;

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

  perform public.consume_listing();

  return v_post;
end;
$$;

grant execute on function public.create_marketplace_post(uuid, text, numeric, jsonb) to authenticated;

-- Create vehicle with entitlement check
-- Drop any existing versions first
drop function if exists public.create_vehicle(text, text, text, text, integer, integer, integer, integer, text, text, text, text, date, date);
drop function if exists public.create_vehicle(text, text, text, integer, integer, integer, text, text, text, text, date, date);

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
  -- Check if can_create_vehicle function exists
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'can_create_vehicle'
  ) then
    raise exception 'can_create_vehicle() function does not exist. Please run migration from the beginning.';
  end if;

  v_can_create := public.can_create_vehicle();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create vehicle');
  end if;

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

-- Grant execute permission (with error handling)
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
    and p.proname = 'create_vehicle'
    and pg_get_function_arguments(p.oid) = 'p_type text, p_vin text, p_make text, p_model text, p_production_year integer, p_mileage integer, p_engine_capacity integer, p_power_hp integer, p_fuel_type text, p_transmission text, p_drive_type text, p_notes text, p_insurance_valid_until date, p_inspection_valid_until date'
  ) then
    grant execute on function public.create_vehicle(text, text, text, text, integer, integer, integer, integer, text, text, text, text, date, date) to authenticated;
  else
    raise exception 'create_vehicle function was not created. Check for errors above.';
  end if;
end;
$$;

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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_add := public.can_add_tire(p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add tire');
  end if;

  if p_is_currently_fitted then
    update public.tires
    set is_currently_fitted = false
    where vehicle_id = p_vehicle_id;
  end if;

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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_add := public.can_add_wheel(p_vehicle_id);
  if not (v_can_add->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_add->>'reason', 'Cannot add wheel');
  end if;

  if p_is_currently_fitted then
    update public.wheels
    set is_currently_fitted = false
    where vehicle_id = p_vehicle_id;
  end if;

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
  v_can_create := public.can_create_workshop();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create workshop');
  end if;

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
-- Note: This function signature matches the existing schema
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
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_can_create := public.can_create_reminder();
  if not (v_can_create->>'allowed')::boolean then
    raise exception '%', coalesce(v_can_create->>'reason', 'Cannot create reminder');
  end if;

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

-- ================
-- Modify existing function: create_report_snapshot_with_options
-- ================

-- Update create_report_snapshot_with_options to use entitlements
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

  -- Consume one report (for free users)
  perform public.consume_report();

  return v_snapshot;
end;
$$;

grant execute on function public.create_report_snapshot_with_options(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ================
-- Initialize entitlements for existing users
-- ================

-- Backfill entitlements for existing users who don't have them yet
insert into public.entitlements (
  user_id,
  plan,
  reports_remaining,
  listings_remaining,
  vehicles_limit,
  photos_per_vehicle_limit,
  tires_per_vehicle_limit,
  wheels_per_vehicle_limit,
  workshops_limit,
  reminders_limit,
  premium_until
)
select
  id,
  'free',
  0,
  0,
  1,
  6,
  1,
  1,
  3,
  5,
  null
from auth.users
where id not in (select user_id from public.entitlements);
