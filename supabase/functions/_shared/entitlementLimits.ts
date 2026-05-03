/**
 * Numeric limits written to `public.entitlements`.
 * Must stay in sync with `internal_default_free_entitlement_limits()` and
 * `internal_default_premium_entitlement_limits()` in `supabase/schema.sql`.
 */
export const FREE_TIER_ENTITLEMENT_LIMITS = {
  vehicles_limit: 1,
  photos_per_vehicle_limit: 6,
  tires_per_vehicle_limit: 1,
  wheels_per_vehicle_limit: 1,
  workshops_limit: 3,
  reminders_limit: 5,
} as const;

export const PREMIUM_TIER_ENTITLEMENT_LIMITS = {
  vehicles_limit: 999,
  photos_per_vehicle_limit: 40,
  tires_per_vehicle_limit: 999,
  wheels_per_vehicle_limit: 999,
  workshops_limit: 999,
  reminders_limit: 999,
} as const;
