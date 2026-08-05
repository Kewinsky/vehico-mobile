-- Lower workshop intake rate limit to 5 submissions / hour / token.
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
  v_max_per_hour constant integer := 5;
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

  -- Rate limit: max 5 submissions / hour / token
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
