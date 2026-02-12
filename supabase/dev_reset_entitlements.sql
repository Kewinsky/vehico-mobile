-- DEV ONLY
-- Reset (or upsert) ALL users to the Free plan entitlements.
--
-- Why this is safe-ish:
-- - The RPC is executable ONLY by the DB role `service_role` (not `authenticated` / `anon`).
-- - Do NOT call it from the mobile app. Use it only in local/dev scripts with the service key.
--
-- How to run (example):
-- - In Supabase SQL editor (connected as service role / postgres), run:
--   select public.dev_reset_all_entitlements_to_free();

-- Drop & recreate for idempotency
drop function if exists public.dev_reset_all_entitlements_to_free();

create or replace function public.dev_reset_all_entitlements_to_free()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hard safety gate: only allow service role (or postgres) to execute.
  -- (Normal client sessions are `authenticated` / `anon` and will be blocked.)
  if current_user not in ('service_role', 'postgres') then
    raise exception 'Forbidden: service_role only';
  end if;

  -- Ensure every auth user has an entitlements row, and reset all to Free defaults.
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
    product_id,
    created_at,
    updated_at
  )
  select
    u.id as user_id,
    'free'::text as plan,
    1 as vehicles_limit,
    6 as photos_per_vehicle_limit,
    1 as tires_per_vehicle_limit,
    1 as wheels_per_vehicle_limit,
    3 as workshops_limit,
    5 as reminders_limit,
    null::timestamptz as premium_until,
    null::text as product_id,
    now() as created_at,
    now() as updated_at
  from auth.users u
  on conflict (user_id) do update set
    plan = excluded.plan,
    vehicles_limit = excluded.vehicles_limit,
    photos_per_vehicle_limit = excluded.photos_per_vehicle_limit,
    tires_per_vehicle_limit = excluded.tires_per_vehicle_limit,
    wheels_per_vehicle_limit = excluded.wheels_per_vehicle_limit,
    workshops_limit = excluded.workshops_limit,
    reminders_limit = excluded.reminders_limit,
    premium_until = excluded.premium_until,
    product_id = excluded.product_id,
    updated_at = now();
end;
$$;

-- Lock down permissions
revoke all on function public.dev_reset_all_entitlements_to_free() from public;
revoke all on function public.dev_reset_all_entitlements_to_free() from anon;
revoke all on function public.dev_reset_all_entitlements_to_free() from authenticated;
grant execute on function public.dev_reset_all_entitlements_to_free() to service_role;

