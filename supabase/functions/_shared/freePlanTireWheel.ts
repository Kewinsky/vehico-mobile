import { createClient } from "npm:@supabase/supabase-js@2.49.1";

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Match SQL public.pick_free_plan_tire_id_for_vehicle: one fitted → that set;
 * 0 fitted → oldest by created_at; 2+ fitted → oldest fitted by created_at.
 */
export async function pickFreePlanTireIdForVehicle(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<string | null> {
  const { data: fitted, error: fittedError } = await supabase
    .from("tires")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("is_currently_fitted", true)
    .order("created_at", { ascending: true });

  if (fittedError) throw fittedError;

  const fittedRows = fitted ?? [];
  if (fittedRows.length >= 1) {
    return fittedRows[0]?.id ?? null;
  }

  const { data: oldest, error: oldestError } = await supabase
    .from("tires")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (oldestError) throw oldestError;
  return oldest?.id ?? null;
}

/**
 * Match SQL public.pick_free_plan_wheel_id_for_vehicle.
 */
export async function pickFreePlanWheelIdForVehicle(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<string | null> {
  const { data: fitted, error: fittedError } = await supabase
    .from("wheels")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("is_currently_fitted", true)
    .order("created_at", { ascending: true });

  if (fittedError) throw fittedError;

  const fittedRows = fitted ?? [];
  if (fittedRows.length >= 1) {
    return fittedRows[0]?.id ?? null;
  }

  const { data: oldest, error: oldestError } = await supabase
    .from("wheels")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (oldestError) throw oldestError;
  return oldest?.id ?? null;
}
