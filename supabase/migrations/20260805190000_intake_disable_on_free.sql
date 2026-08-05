-- Workshop QR intake is Premium-only:
-- 1) set_vehicle_intake_enabled(true) requires active premium (user opt-in only)
-- 2) Premium → free: applyRevenueCatEntitlementUpdate sets intake_enabled=false (tokens kept)
-- 3) Free → premium: never auto-enables intake; user must turn the link on themselves

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
  v_entitlement public.entitlements;
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
    select * into v_entitlement
    from public.entitlements e
    where e.user_id = auth.uid();

    if v_entitlement is null
       or not public.is_entitlement_premium_active(v_entitlement) then
      raise exception 'Premium required to enable workshop intake';
    end if;

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
