-- Report photos: store copies only in report-photos bucket (not images).
--
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push / migration up).
-- Deploy together with a mobile app build that calls:
--   - create_report_snapshot(p_vehicle_id, p_report_options)
--   - update_report_photos(p_report_id, p_photos_data)
--
-- Old app versions will break after this migration until users update the app.

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
  if not v_include_inspection then
    v_vehicle := v_vehicle || jsonb_build_object('inspection_valid_until', null);
  end if;

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
