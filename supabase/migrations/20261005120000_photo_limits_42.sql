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
  select 999, 42, 999, 999, 999, 999;
$$;

update public.entitlements
set photos_per_vehicle_limit = 42
where plan in ('premium', 'lifetime')
  and photos_per_vehicle_limit = 40;

update storage.buckets
set file_size_limit = 10485760
where id in ('images', 'report-photos');

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

  if jsonb_array_length(p_photos_data) > 42 then
    raise exception 'Maximum 42 photos per report';
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

  v_snapshot_data := v_snapshot_data || jsonb_build_object(
    'vehicle_photos',
    v_vehicle_photos
  );

  update public.reports
  set snapshot_data = v_snapshot_data
  where id = p_report_id
  returning * into v_report;

  return v_report;
end;
$$;

grant execute on function public.update_report_photos(uuid, jsonb) to authenticated;
