-- Epic B MVP: workshop QR intake (token + pending approval)
-- No workshop_orgs / verified badge in this migration.

-- ---------------------------------------------------------------------------
-- vehicles: intake token + toggle
-- ---------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists intake_token text,
  add column if not exists intake_enabled boolean not null default false;

create unique index if not exists vehicles_intake_token_uidx
  on public.vehicles (intake_token)
  where intake_token is not null;

-- ---------------------------------------------------------------------------
-- service_entries: source + approval status + workshop contact
-- ---------------------------------------------------------------------------
alter table public.service_entries
  add column if not exists source text not null default 'owner',
  add column if not exists status text not null default 'approved',
  add column if not exists submitted_workshop_name text,
  add column if not exists submitted_workshop_phone text,
  add column if not exists reviewed_at timestamptz;

alter table public.service_entries
  drop constraint if exists service_entries_source_check;
alter table public.service_entries
  add constraint service_entries_source_check
  check (source in ('owner', 'workshop'));

alter table public.service_entries
  drop constraint if exists service_entries_status_check;
alter table public.service_entries
  add constraint service_entries_status_check
  check (status in ('approved', 'pending', 'rejected'));

alter table public.service_entries
  drop constraint if exists service_entries_workshop_name_when_workshop;
alter table public.service_entries
  add constraint service_entries_workshop_name_when_workshop
  check (
    source <> 'workshop'
    or (
      submitted_workshop_name is not null
      and length(trim(submitted_workshop_name)) > 0
    )
  );

-- Backfill safety (existing rows already default to owner/approved)
update public.service_entries
set source = 'owner'
where source is null or source = '';

update public.service_entries
set status = 'approved'
where status is null or status = '';

create index if not exists service_entries_vehicle_status_idx
  on public.service_entries (vehicle_id, status);

create index if not exists service_entries_vehicle_source_idx
  on public.service_entries (vehicle_id, source);

-- ---------------------------------------------------------------------------
-- Simple per-token rate limit (sliding hour window)
-- ---------------------------------------------------------------------------
create table if not exists public.workshop_intake_rate_limits (
  intake_token text primary key,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0
    check (submission_count >= 0)
);

alter table public.workshop_intake_rate_limits enable row level security;
-- No policies for anon/authenticated – only security definer RPCs touch this.

-- ---------------------------------------------------------------------------
-- Owner: enable / disable intake (generates token on first enable)
-- ---------------------------------------------------------------------------
create or replace function public.set_vehicle_intake_enabled(
  p_vehicle_id uuid,
  p_enabled boolean
)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.vehicles v
  where v.id = p_vehicle_id
    and v.owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'Vehicle not found';
  end if;

  if p_enabled then
    if v_row.intake_token is null then
      v_row.intake_token := replace(gen_random_uuid()::text, '-', '');
    end if;
    v_row.intake_enabled := true;
  else
    v_row.intake_enabled := false;
    -- Keep token so re-enable reuses the same QR/link.
  end if;

  update public.vehicles
  set
    intake_token = v_row.intake_token,
    intake_enabled = v_row.intake_enabled
  where id = p_vehicle_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_vehicle_intake_enabled(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Owner: rotate intake token (invalidates old QR/link)
-- ---------------------------------------------------------------------------
create or replace function public.regenerate_vehicle_intake_token(
  p_vehicle_id uuid
)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.vehicles
  set intake_token = replace(gen_random_uuid()::text, '-', '')
  where id = p_vehicle_id
    and owner_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Vehicle not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.regenerate_vehicle_intake_token(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Anon: public vehicle info for intake form
-- ---------------------------------------------------------------------------
create or replace function public.get_vehicle_intake_by_token(p_token text)
returns table (
  make text,
  model text,
  production_year integer,
  type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return;
  end if;

  return query
  select
    v.make,
    v.model,
    v.production_year,
    v.type
  from public.vehicles v
  where v.intake_token = trim(p_token)
    and v.intake_enabled = true
  limit 1;
end;
$$;

grant execute on function public.get_vehicle_intake_by_token(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Anon: submit workshop service entry (pending)
-- ---------------------------------------------------------------------------
create or replace function public.submit_workshop_service_entry(
  p_token text,
  p_title text,
  p_description text,
  p_service_date date,
  p_mileage integer,
  p_workshop_name text,
  p_workshop_phone text default null,
  p_category text default 'other'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
  v_title text;
  v_description text;
  v_workshop_name text;
  v_workshop_phone text;
  v_category text;
  v_entry_id uuid;
  v_limit public.workshop_intake_rate_limits;
  v_max_per_hour constant integer := 10;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  v_title := trim(coalesce(p_title, ''));
  v_description := trim(coalesce(p_description, ''));
  v_workshop_name := trim(coalesce(p_workshop_name, ''));
  v_workshop_phone := nullif(trim(coalesce(p_workshop_phone, '')), '');
  v_category := coalesce(nullif(trim(coalesce(p_category, '')), ''), 'other');

  if length(v_title) < 2 or length(v_title) > 120 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  if length(v_description) > 2000 then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;
  if length(v_workshop_name) < 2 or length(v_workshop_name) > 120 then
    raise exception 'invalid_workshop_name' using errcode = 'P0001';
  end if;
  if v_workshop_phone is not null then
    if length(v_workshop_phone) > 40
       or v_workshop_phone !~ '^\+?[0-9[:space:]\-().]+$'
       or length(regexp_replace(v_workshop_phone, '[^0-9]', '', 'g')) < 7
       or length(regexp_replace(v_workshop_phone, '[^0-9]', '', 'g')) > 15
    then
      raise exception 'invalid_workshop_phone' using errcode = 'P0001';
    end if;
  end if;
  if p_service_date is null
     or p_service_date > (current_date + 1)
     or p_service_date < (current_date - interval '3650 days')::date then
    raise exception 'invalid_service_date' using errcode = 'P0001';
  end if;
  if p_mileage is not null and (p_mileage < 0 or p_mileage > 5000000) then
    raise exception 'invalid_mileage' using errcode = 'P0001';
  end if;
  if v_category not in (
    'maintenance', 'repair', 'inspection', 'upgrade', 'oil_change', 'other'
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  select * into v_vehicle
  from public.vehicles v
  where v.intake_token = trim(p_token)
    and v.intake_enabled = true
  for share;

  if not found then
    raise exception 'intake_unavailable' using errcode = 'P0001';
  end if;

  -- Rate limit: max 10 submissions / hour / token
  select * into v_limit
  from public.workshop_intake_rate_limits r
  where r.intake_token = v_vehicle.intake_token
  for update;

  if not found then
    insert into public.workshop_intake_rate_limits (
      intake_token, window_started_at, submission_count
    ) values (v_vehicle.intake_token, now(), 1);
  elsif v_limit.window_started_at < now() - interval '1 hour' then
    update public.workshop_intake_rate_limits
    set window_started_at = now(), submission_count = 1
    where intake_token = v_vehicle.intake_token;
  elsif v_limit.submission_count >= v_max_per_hour then
    raise exception 'rate_limited' using errcode = 'P0001';
  else
    update public.workshop_intake_rate_limits
    set submission_count = submission_count + 1
    where intake_token = v_vehicle.intake_token;
  end if;

  insert into public.service_entries (
    vehicle_id,
    service_date,
    mileage,
    category,
    title,
    description,
    cost,
    workshop_id,
    workshop_snapshot,
    source,
    status,
    submitted_workshop_name,
    submitted_workshop_phone,
    reviewed_at
  ) values (
    v_vehicle.id,
    p_service_date,
    p_mileage,
    v_category,
    v_title,
    v_description,
    null,
    null,
    v_workshop_name,
    'workshop',
    'pending',
    v_workshop_name,
    v_workshop_phone,
    null
  )
  returning id into v_entry_id;

  return jsonb_build_object('ok', true, 'id', v_entry_id);
end;
$$;

grant execute on function public.submit_workshop_service_entry(
  text, text, text, date, integer, text, text, text
) to anon, authenticated;

-- Rate-limit table is RPC-only
revoke all on table public.workshop_intake_rate_limits from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner: approve / reject pending workshop entry
-- ---------------------------------------------------------------------------
create or replace function public.approve_workshop_service_entry(p_entry_id uuid)
returns public.service_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.service_entries;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.service_entries se
  set
    status = 'approved',
    reviewed_at = now()
  from public.vehicles v
  where se.id = p_entry_id
    and se.vehicle_id = v.id
    and v.owner_id = auth.uid()
    and se.source = 'workshop'
    and se.status = 'pending'
  returning se.* into v_entry;

  if not found then
    raise exception 'Entry not found or not pending';
  end if;

  return v_entry;
end;
$$;

grant execute on function public.approve_workshop_service_entry(uuid)
  to authenticated;

create or replace function public.reject_workshop_service_entry(p_entry_id uuid)
returns public.service_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.service_entries;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.service_entries se
  using public.vehicles v
  where se.id = p_entry_id
    and se.vehicle_id = v.id
    and v.owner_id = auth.uid()
    and se.source = 'workshop'
    and se.status = 'pending'
  returning se.* into v_entry;

  if not found then
    raise exception 'Entry not found or not pending';
  end if;

  return v_entry;
end;
$$;

grant execute on function public.reject_workshop_service_entry(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Snapshot: only approved service entries + workshop badge fields
-- ---------------------------------------------------------------------------
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
  v_vehicle_equipment jsonb;
  v_include_service_history boolean;
  v_include_service_stats boolean;
  v_include_modifications boolean;
  v_include_fueling_stats boolean;
  v_include_insurance boolean;
  v_include_ac boolean;
  v_include_inspection boolean;
  v_include_notes boolean;
  v_include_wheels boolean;
  v_include_tires boolean;
  v_include_equipment boolean;
  v_distance_unit text;
  v_fuel_unit text;
  v_currency text;
  v_owner_id uuid;
begin
  select owner_id into v_owner_id
  from public.vehicles
  where id = p_vehicle_id;

  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Vehicle not found or access denied';
  end if;

  v_include_service_history := coalesce((p_report_options->>'include_service_history')::boolean, false);
  v_include_service_stats := coalesce((p_report_options->>'include_service_stats')::boolean, false);
  v_include_modifications := coalesce((p_report_options->>'include_modifications')::boolean, false);
  v_include_fueling_stats := coalesce((p_report_options->>'include_fueling_stats')::boolean, false);
  v_include_insurance := coalesce((p_report_options->>'include_insurance')::boolean, false);
  v_include_ac := coalesce((p_report_options->>'include_ac')::boolean, false);
  v_include_inspection := coalesce((p_report_options->>'include_inspection')::boolean, false);
  v_include_notes := coalesce((p_report_options->>'include_notes')::boolean, false);
  v_include_wheels := coalesce((p_report_options->>'include_wheels')::boolean, false);
  v_include_tires := coalesce((p_report_options->>'include_tires')::boolean, false);
  v_include_equipment := coalesce((p_report_options->>'include_equipment')::boolean, false);
  v_distance_unit := coalesce(p_report_options->>'distance_unit', 'km');
  v_fuel_unit := coalesce(p_report_options->>'fuel_unit', 'liters');
  v_currency := coalesce(p_report_options->>'currency', 'PLN');

  select to_jsonb(v.*) into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id;

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

  -- Strip intake fields from public snapshot
  v_vehicle := v_vehicle - 'intake_token' - 'intake_enabled' - 'owner_id';

  if v_include_service_history or v_include_service_stats or v_include_modifications then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', se.id,
        'service_date', se.service_date,
        'mileage', se.mileage,
        'category', se.category,
        'title', se.title,
        'description', se.description,
        'cost', se.cost,
        'source', se.source,
        'workshop_snapshot', se.workshop_snapshot,
        'submitted_workshop_name', se.submitted_workshop_name,
        'created_at', se.created_at
      ) order by se.service_date desc
    ), '[]'::jsonb) into v_service_entries
    from public.service_entries se
    where se.vehicle_id = p_vehicle_id
      and se.status = 'approved';
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

  if v_include_equipment then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', ve.id,
        'preset_key', ve.preset_key,
        'label', ve.label,
        'created_at', ve.created_at
      ) order by ve.created_at asc
    ), '[]'::jsonb) into v_vehicle_equipment
    from public.vehicle_equipment ve
    where ve.vehicle_id = p_vehicle_id;
  else
    v_vehicle_equipment := '[]'::jsonb;
  end if;

  v_vehicle_photos := '[]'::jsonb;

  v_snapshot := jsonb_build_object(
    'vehicle', v_vehicle,
    'service_entries', v_service_entries,
    'vehicle_photos', v_vehicle_photos,
    'vehicle_tires', v_vehicle_tires,
    'vehicle_wheels', v_vehicle_wheels,
    'vehicle_equipment', v_vehicle_equipment,
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
