/**
 * Single write path for `public.entitlements` from RevenueCat: map a resolved plan update + free-plan
 * side effects in one place. Called only from `revenuecat-webhook` (the app does not sync plan here).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  FREE_TIER_ENTITLEMENT_LIMITS,
  PREMIUM_TIER_ENTITLEMENT_LIMITS,
} from "./entitlementLimits.ts";

export type EntitlementPlan = "free" | "premium" | "lifetime";

export type EntitlementsUpdate = {
  plan: EntitlementPlan;
  premium_until: string | null;
  product_id: string | null;
  vehicles_limit: number;
  photos_per_vehicle_limit: number;
  tires_per_vehicle_limit: number;
  wheels_per_vehicle_limit: number;
  workshops_limit: number;
  reminders_limit: number;
};

type SupabaseClient = ReturnType<typeof createClient>;

type FreePlanSelections = {
  freePlanVehicleId: string | null;
  freePlanWorkshopIds: string[];
};

async function buildFreePlanSelections(
  supabase: SupabaseClient,
  userId: string,
  preferredVehicleId: string | null,
): Promise<FreePlanSelections> {
  console.log("[buildFreePlanSelections] preferredVehicleId:", preferredVehicleId);

  const { data: workshopRows, error: workshopError } = await supabase
    .from("workshops")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(FREE_TIER_ENTITLEMENT_LIMITS.workshops_limit);
  if (workshopError) throw workshopError;
  console.log("[buildFreePlanSelections] workshops found:", workshopRows?.length ?? 0);

  let freePlanVehicleId = preferredVehicleId;
  if (freePlanVehicleId) {
    const { data: preferredVehicleRows, error: preferredVehicleError } =
      await supabase
        .from("vehicles")
        .select("id")
        .eq("id", freePlanVehicleId)
        .eq("owner_id", userId)
        .limit(1);
    if (preferredVehicleError) throw preferredVehicleError;
    freePlanVehicleId = preferredVehicleRows?.[0]?.id ?? null;
    console.log("[buildFreePlanSelections] preferred vehicle resolved:", freePlanVehicleId);
  }

  if (!freePlanVehicleId) {
    const { data: vehicleRows, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(2);
    if (vehicleError) throw vehicleError;
    console.log("[buildFreePlanSelections] vehicle fallback — total vehicles found:", vehicleRows?.length ?? 0, "ids:", vehicleRows?.map((v: { id: string }) => v.id));
    freePlanVehicleId =
      vehicleRows != null && vehicleRows.length === 1
        ? (vehicleRows[0]?.id ?? null)
        : null;
    console.log("[buildFreePlanSelections] fallback vehicle resolved:", freePlanVehicleId);
  }

  return {
    freePlanVehicleId: freePlanVehicleId ?? null,
    freePlanWorkshopIds: (workshopRows ?? []).map(
      (row: { id: string }) => row.id,
    ),
  };
}

export async function applyRevenueCatEntitlementUpdate(
  supabase: SupabaseClient,
  userId: string,
  update: EntitlementsUpdate,
  preferredFreePlanVehicleId: string | null,
): Promise<{ error: { message: string } | null }> {
  const now = new Date().toISOString();
  let freePlanVehicleIdForRecompute: string | null = null;

  console.log("[applyRevenueCatEntitlementUpdate] userId:", userId, "plan:", update.plan, "preferredFreePlanVehicleId:", preferredFreePlanVehicleId);

  const dbUpdate: Record<string, unknown> = {
    plan: update.plan,
    premium_until: update.premium_until,
    product_id: update.product_id,
    vehicles_limit: update.vehicles_limit,
    photos_per_vehicle_limit: update.photos_per_vehicle_limit,
    tires_per_vehicle_limit: update.tires_per_vehicle_limit,
    wheels_per_vehicle_limit: update.wheels_per_vehicle_limit,
    workshops_limit: update.workshops_limit,
    reminders_limit: update.reminders_limit,
    updated_at: now,
  };

  if (update.plan === "free") {
    const freePlanSelections = await buildFreePlanSelections(
      supabase,
      userId,
      preferredFreePlanVehicleId,
    );
    freePlanVehicleIdForRecompute = freePlanSelections.freePlanVehicleId;
    console.log("[applyRevenueCatEntitlementUpdate] freePlanVehicleIdForRecompute:", freePlanVehicleIdForRecompute);
    dbUpdate.downgraded_at = now;
    dbUpdate.free_plan_vehicle_id = freePlanSelections.freePlanVehicleId;
    dbUpdate.free_plan_workshop_ids = freePlanSelections.freePlanWorkshopIds;
    // free_plan_reminder_ids, free_plan_tire_id, free_plan_wheel_id are NOT
    // written here — owned exclusively by the SQL sync functions called below
    // and by row-level triggers on `reminders`, `tires`, and `wheels`.
  } else {
    dbUpdate.free_plan_vehicle_id = null;
    dbUpdate.downgraded_at = null;
    dbUpdate.free_plan_workshop_ids = [];
    dbUpdate.free_plan_reminder_ids = [];
    dbUpdate.free_plan_tire_id = null;
    dbUpdate.free_plan_wheel_id = null;
  }

  console.log("[applyRevenueCatEntitlementUpdate] writing dbUpdate keys:", Object.keys(dbUpdate));

  const { error } = await supabase
    .from("entitlements")
    .update(dbUpdate)
    .eq("user_id", userId);

  if (error) {
    console.error("[applyRevenueCatEntitlementUpdate] dbUpdate error:", error.message);
    return { error: { message: error.message } };
  }
  console.log("[applyRevenueCatEntitlementUpdate] dbUpdate ok");

  if (update.plan === "free") {
    if (freePlanVehicleIdForRecompute) {
      console.log("[applyRevenueCatEntitlementUpdate] calling SQL recompute for vehicle:", freePlanVehicleIdForRecompute);
      const [reminderResult, tireResult, wheelResult] = await Promise.all([
        supabase.rpc("entitlements_recompute_free_plan_reminder_ids_for_vehicle", {
          p_vehicle_id: freePlanVehicleIdForRecompute,
        }),
        supabase.rpc("entitlements_sync_free_plan_tire_ids_for_vehicle", {
          p_vehicle_id: freePlanVehicleIdForRecompute,
        }),
        supabase.rpc("entitlements_sync_free_plan_wheel_ids_for_vehicle", {
          p_vehicle_id: freePlanVehicleIdForRecompute,
        }),
      ]);
      console.log("[applyRevenueCatEntitlementUpdate] sync results — reminder:", reminderResult.error?.message ?? "ok", "tire:", tireResult.error?.message ?? "ok", "wheel:", wheelResult.error?.message ?? "ok");
      const syncError =
        reminderResult.error ?? tireResult.error ?? wheelResult.error;
      if (syncError) {
        console.error("[applyRevenueCatEntitlementUpdate] sync error:", syncError.message);
        return { error: { message: syncError.message } };
      }
      console.log("[applyRevenueCatEntitlementUpdate] all SQL syncs completed successfully");
    } else {
      console.log("[applyRevenueCatEntitlementUpdate] no vehicle resolved — clearing reminder/tire/wheel fields");
      const { error: clearError } = await supabase
        .from("entitlements")
        .update({
          free_plan_reminder_ids: [],
          free_plan_tire_id: null,
          free_plan_wheel_id: null,
          updated_at: now,
        })
        .eq("user_id", userId);
      if (clearError) {
        console.error("[applyRevenueCatEntitlementUpdate] clear error:", clearError.message);
        return { error: { message: clearError.message } };
      }
      console.log("[applyRevenueCatEntitlementUpdate] fields cleared");
    }
  }

  return { error: null };
}

export { PREMIUM_TIER_ENTITLEMENT_LIMITS, FREE_TIER_ENTITLEMENT_LIMITS };
