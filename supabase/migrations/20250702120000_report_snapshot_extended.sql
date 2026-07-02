-- Extended public report snapshot: richer fueling stats, mileage audit, granular chart flags.

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
  v_fueling_stats jsonb;
  v_vehicle_photos jsonb;
  v_vehicle_tires jsonb;
  v_vehicle_wheels jsonb;
  v_mileage_audit jsonb;
  v_include_service_history boolean;
  v_include_service_stats boolean;
  v_include_oil_change boolean;
  v_include_expenses_by_category boolean;
  v_include_expenses_over_time boolean;
  v_include_mileage_over_time boolean;
  v_include_notes boolean;
  v_include_insurance boolean;
  v_include_inspection boolean;
  v_include_wheels boolean;
  v_include_tires boolean;
  v_include_fueling_stats boolean;
  v_distance_unit text := 'km';
  v_fuel_unit text := 'liters';
  v_currency text := 'PLN';
  v_need_service_entries boolean;
begin
  v_include_service_history := coalesce((p_report_options->>'include_service_history')::boolean, false);
  v_include_service_stats := coalesce((p_report_options->>'include_service_stats')::boolean, false);
  v_include_oil_change := coalesce((p_report_options->>'include_oil_change')::boolean, false);
  v_include_expenses_by_category := coalesce((p_report_options->>'include_expenses_by_category_chart')::boolean, false);
  v_include_expenses_over_time := coalesce((p_report_options->>'include_expenses_over_time_chart')::boolean, false);
  v_include_mileage_over_time := coalesce((p_report_options->>'include_mileage_over_time_chart')::boolean, false);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, false);
  v_include_insurance := coalesce((p_report_options->>'include_insurance')::boolean, true);
  v_include_inspection := coalesce((p_report_options->>'include_inspection')::boolean, true);
  v_include_wheels := coalesce((p_report_options->>'include_wheels')::boolean, false);
  v_include_tires := coalesce((p_report_options->>'include_tires')::boolean, false);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_distance_unit := coalesce((p_report_options->>'distance_unit')::text, 'km');
  v_fuel_unit := coalesce((p_report_options->>'fuel_unit')::text, 'liters');
  v_currency := coalesce((p_report_options->>'currency')::text, 'PLN');

  v_need_service_entries :=
    v_include_service_history
    or v_include_service_stats
    or v_include_oil_change
    or v_include_expenses_by_category
    or v_include_expenses_over_time
    or v_include_mileage_over_time;

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

  if v_need_service_entries then
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
    select jsonb_build_object(
      'avg_consumption',
        case
          when coalesce(sum(fe.distance), 0) > 0 then
            (coalesce(sum(fe.fuel_amount), 0) / sum(fe.distance)) * 100
          else null
        end,
      'total_distance', coalesce(sum(fe.distance), 0),
      'total_fuel', coalesce(sum(fe.fuel_amount), 0),
      'total_cost', coalesce(sum(fe.fuel_cost), 0),
      'entry_count', count(*)::int,
      'avg_cost_per_liter',
        case
          when coalesce(sum(fe.fuel_amount), 0) > 0 then
            coalesce(sum(fe.fuel_cost), 0) / sum(fe.fuel_amount)
          else null
        end
    )
    into v_fueling_stats
    from public.fueling_entries fe
    where fe.vehicle_id = p_vehicle_id;
  end if;

  if v_include_mileage_over_time then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'reading_date', ma.reading_date,
        'mileage', ma.mileage,
        'source', ma.source
      ) order by ma.reading_date asc
    ), '[]'::jsonb) into v_mileage_audit
    from public.mileage_audit ma
    where ma.vehicle_id = p_vehicle_id;
  else
    v_mileage_audit := '[]'::jsonb;
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
    'mileage_audit', v_mileage_audit,
    'units', jsonb_build_object(
      'distance_unit', v_distance_unit,
      'fuel_unit', v_fuel_unit,
      'currency', v_currency
    ),
    'report_options', p_report_options,
    'snapshot_version', '2.1',
    'snapshot_date', now()
  );

  if v_include_fueling_stats then
    v_snapshot := v_snapshot || jsonb_build_object('fueling_stats', v_fueling_stats);
  end if;

  return v_snapshot;
end;
$$;
