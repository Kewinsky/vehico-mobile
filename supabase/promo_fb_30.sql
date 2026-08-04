-- Promo FB: pierwsze konta → Premium 14 dni (product_id = promo_fb_30)
-- Okno startu kampanii (Europe/Warsaw): zmień datę przy kolejnej akcji.
-- Uruchamiaj w Supabase SQL Editor.

-- =============================================================================
-- 1) Kandydaci: nowe konta od startu kampanii, bez tych co już mają promo
-- =============================================================================
select
  u.id,
  u.email,
  u.created_at at time zone 'Europe/Warsaw' as created_at_warsaw,
  e.plan,
  e.product_id,
  e.premium_until
from auth.users u
join public.entitlements e on e.user_id = u.id
where u.created_at >= timestamptz '2026-08-04 08:00:00+02'
  and coalesce(e.product_id, '') <> 'promo_fb_30'
order by u.created_at asc;

-- =============================================================================
-- 2) Grant Premium po ID (14 dni → koniec dnia w PL, format jak w DB)
-- Wklej UUID z query 1 do listy poniżej.
-- =============================================================================
update public.entitlements e
set
  plan = 'premium',
  premium_until = (
    (timezone('Europe/Warsaw', now())::date + 14)
      + time '23:59:59'
  ) at time zone 'Europe/Warsaw',
  product_id = 'promo_fb_30',
  vehicles_limit = 999,
  photos_per_vehicle_limit = 40,
  tires_per_vehicle_limit = 999,
  wheels_per_vehicle_limit = 999,
  workshops_limit = 999,
  reminders_limit = 999,
  free_plan_vehicle_id = null,
  free_plan_workshop_ids = '{}',
  free_plan_reminder_ids = '{}',
  free_plan_tire_id = null,
  free_plan_wheel_id = null,
  downgraded_at = null,
  updated_at = now()
where e.user_id in (
  '00000000-0000-0000-0000-000000000001'::uuid
  -- ,'00000000-0000-0000-0000-000000000002'::uuid
)
returning e.user_id, e.plan, e.product_id, e.premium_until;

-- =============================================================================
-- 3) Wszystkie konta z promo_fb_30
-- =============================================================================
select
  u.id,
  u.email,
  u.created_at,
  e.plan,
  e.product_id,
  e.premium_until,
  e.updated_at
from public.entitlements e
join auth.users u on u.id = e.user_id
where e.product_id = 'promo_fb_30'
order by e.updated_at desc;
