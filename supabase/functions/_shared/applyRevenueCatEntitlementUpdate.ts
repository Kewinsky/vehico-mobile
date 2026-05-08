/**
 * Single write path for `public.entitlements` from RevenueCat: map a resolved plan update + free-plan
 * side effects in one place. Called only from `revenuecat-webhook` (the app does not sync plan here).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  pickFreePlanTireIdForVehicle,
  pickFreePlanWheelIdForVehicle,
} from "./freePlanTireWheel.ts";
import { pickFreePlanReminderIds } from "./freePlanReminders.ts";
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
  freePlanReminderIds: string[];
  freePlanTireId: string | null;
  freePlanWheelId: string | null;
};

async function buildFreePlanSelections(
  supabase: SupabaseClient,
  userId: string,
  preferredVehicleId: string | null,
): Promise<FreePlanSelections> {
  const { data: workshopRows, error: workshopError } = await supabase
    .from("workshops")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(FREE_TIER_ENTITLEMENT_LIMITS.workshops_limit);
  if (workshopError) throw workshopError;

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
  }

  if (!freePlanVehicleId) {
    const { data: vehicleRows, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(2);
    if (vehicleError) throw vehicleError;
    freePlanVehicleId =
      vehicleRows != null && vehicleRows.length === 1
        ? (vehicleRows[0]?.id ?? null)
        : null;
  }

  if (!freePlanVehicleId) {
    return {
      freePlanVehicleId: null,
      freePlanWorkshopIds: (workshopRows ?? []).map(
        (row: { id: string }) => row.id,
      ),
      freePlanReminderIds: [],
      freePlanTireId: null,
      freePlanWheelId: null,
    };
  }

  const [reminderFetch, freePlanTireId, freePlanWheelId] = await Promise.all([
    supabase
      .from("reminders")
      .select("id,status,created_at")
      .eq("vehicle_id", freePlanVehicleId),
    pickFreePlanTireIdForVehicle(supabase, freePlanVehicleId),
    pickFreePlanWheelIdForVehicle(supabase, freePlanVehicleId),
  ]);

  if (reminderFetch.error) throw reminderFetch.error;

  const freePlanReminderIds = pickFreePlanReminderIds(
    reminderFetch.data ?? [],
    FREE_TIER_ENTITLEMENT_LIMITS.reminders_limit,
  );

  return {
    freePlanVehicleId,
    freePlanWorkshopIds: (workshopRows ?? []).map(
      (row: { id: string }) => row.id,
    ),
    freePlanReminderIds,
    freePlanTireId,
    freePlanWheelId,
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
    dbUpdate.downgraded_at = now;
    dbUpdate.free_plan_vehicle_id = freePlanSelections.freePlanVehicleId;
    dbUpdate.free_plan_workshop_ids = freePlanSelections.freePlanWorkshopIds;
    dbUpdate.free_plan_reminder_ids = freePlanSelections.freePlanReminderIds;
    dbUpdate.free_plan_tire_id = freePlanSelections.freePlanTireId;
    dbUpdate.free_plan_wheel_id = freePlanSelections.freePlanWheelId;
  } else {
    dbUpdate.free_plan_vehicle_id = null;
    dbUpdate.downgraded_at = null;
    dbUpdate.free_plan_workshop_ids = [];
    dbUpdate.free_plan_reminder_ids = [];
    dbUpdate.free_plan_tire_id = null;
    dbUpdate.free_plan_wheel_id = null;
  }

  const { error } = await supabase
    .from("entitlements")
    .update(dbUpdate)
    .eq("user_id", userId);

  if (error) {
    return { error: { message: error.message } };
  }

  if (update.plan === "free" && freePlanVehicleIdForRecompute) {
    // Enforce DB-side canonical ordering: active first, then done, oldest first.
    const { error: recomputeError } = await supabase.rpc(
      "entitlements_recompute_free_plan_reminder_ids_for_vehicle",
      {
        p_vehicle_id: freePlanVehicleIdForRecompute,
      },
    );
    if (recomputeError) {
      return { error: { message: recomputeError.message } };
    }
  }

  return { error: null };
}

export { PREMIUM_TIER_ENTITLEMENT_LIMITS, FREE_TIER_ENTITLEMENT_LIMITS };
