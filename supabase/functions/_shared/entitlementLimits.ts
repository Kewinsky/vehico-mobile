/**
 * Numeric limits written to `public.entitlements`.
 * Must stay in sync with `internal_default_free_entitlement_limits()` and
 * `internal_default_premium_entitlement_limits()` in `supabase/schema.sql`.
 */
export {
  FREE_TIER_ENTITLEMENT_LIMITS,
  PREMIUM_TIER_ENTITLEMENT_LIMITS,
} from "../../../shared/limits/entitlementLimits.ts";
