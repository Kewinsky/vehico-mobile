-- G1: AC/OC split, wider vehicle types (upgrade category label = Modyfikacje in app)

-- 1. AC valid until (OC stays on insurance_valid_until)
alter table public.vehicles
  add column if not exists ac_valid_until date;

-- 2. Wider vehicle types
alter table public.vehicles
  drop constraint if exists vehicles_type_check;

alter table public.vehicles
  add constraint vehicles_type_check
  check (type in ('car', 'motorcycle', 'van', 'truck', 'camper', 'trailer', 'other'));

-- 3. service_entries.category unchanged (upgrade = Modyfikacje in UI)

-- 4. create_vehicle with ac_valid_until
drop function if exists public.create_vehicle(text, text, text, text, integer, integer, date, text, integer, integer, text, text, text, text, date, date);

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
  p_ac_valid_until date,
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
    ac_valid_until,
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
    p_ac_valid_until,
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

grant execute on function public.create_vehicle(
  text, text, text, text, integer, integer, date, text, integer, integer, text, text, text, text, date, date, date
) to authenticated;

-- 5. generate_vehicle_snapshot: include_ac, include_modifications
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
  v_include_modifications boolean;
  v_include_notes boolean;
  v_include_insurance boolean;
  v_include_ac boolean;
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
  v_include_modifications := coalesce((p_report_options->>'include_modifications')::boolean, false);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, false);
  v_include_insurance := coalesce((p_report_options->>'include_insurance')::boolean, true);
  v_include_ac := coalesce((p_report_options->>'include_ac')::boolean, true);
  v_include_inspection := coalesce((p_report_options->>'include_inspection')::boolean, true);
  v_include_wheels := coalesce((p_report_options->>'include_wheels')::boolean, false);
  v_include_tires := coalesce((p_report_options->>'include_tires')::boolean, false);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_distance_unit := coalesce((p_report_options->>'distance_unit')::text, 'km');
  v_fuel_unit := coalesce((p_report_options->>'fuel_unit')::text, 'liters');
  v_currency := coalesce((p_report_options->>'currency')::text, 'PLN');

  select to_jsonb(v.*) into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id;

  if v_vehicle is null then
    raise exception 'Vehicle not found: %', p_vehicle_id;
  end if;

  if not v_include_notes then
    v_vehicle := v_vehicle || jsonb_build_object('notes', null);
  end if;
  if not v_include_insurance then
    v_vehicle := v_vehicle || jsonb_build_object('insurance_valid_until', null);
  end if;
  if not v_include_ac then
    v_vehicle := v_vehicle || jsonb_build_object('ac_valid_until', null);
  end if;
  if not v_include_inspection then
    v_vehicle := v_vehicle || jsonb_build_object('inspection_valid_until', null);
  end if;

  if v_include_service_history
    or v_include_service_stats
    or v_include_modifications then
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

  if v_include_service_history then
    null;
  elsif v_include_modifications then
    select coalesce(jsonb_agg(elem order by (elem->>'service_date') desc), '[]'::jsonb)
    into v_service_entries
    from jsonb_array_elements(v_service_entries) elem
    where elem->>'category' = 'upgrade';
  elsif not v_include_service_stats then
    v_service_entries := '[]'::jsonb;
  end if;

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
