-- Audit log for manual odometer updates from the vehicle profile (and initial mileage on create).

create table if not exists public.mileage_audit (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  reading_date date not null,
  mileage integer not null check (mileage >= 0),
  source text not null default 'profile' check (source in ('profile')),
  created_at timestamptz not null default now()
);

create index if not exists mileage_audit_vehicle_id_idx on public.mileage_audit(vehicle_id);
create index if not exists mileage_audit_reading_date_idx
  on public.mileage_audit(vehicle_id, reading_date desc);

alter table public.mileage_audit enable row level security;

drop policy if exists mileage_audit_select_own_vehicle on public.mileage_audit;
create policy mileage_audit_select_own_vehicle
on public.mileage_audit for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = mileage_audit.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists mileage_audit_insert_own_vehicle on public.mileage_audit;
create policy mileage_audit_insert_own_vehicle
on public.mileage_audit for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = mileage_audit.vehicle_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists mileage_audit_delete_own_vehicle on public.mileage_audit;
create policy mileage_audit_delete_own_vehicle
on public.mileage_audit for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = mileage_audit.vehicle_id
      and v.owner_id = auth.uid()
  )
);

-- Backfill one row per vehicle from the current profile snapshot.
insert into public.mileage_audit (vehicle_id, reading_date, mileage, source)
select v.id, v.mileage_updated_at, v.mileage, 'profile'
from public.vehicles v
where v.mileage is not null
  and v.mileage_updated_at is not null
  and not exists (
    select 1
    from public.mileage_audit ma
    where ma.vehicle_id = v.id
  );

-- Record initial mileage when creating a vehicle.
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

  if p_mileage is not null then
    insert into public.mileage_audit (vehicle_id, reading_date, mileage, source)
    values (v_vehicle.id, current_date, p_mileage, 'profile');
  end if;

  return v_vehicle;
end;
$$;

grant execute on function public.create_vehicle(text, text, text, text, integer, integer, date, text, integer, integer, text, text, text, text, date, date) to authenticated;
