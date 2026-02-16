import { supabase } from "../supabase/client";
import type { VehicleTire, TireType } from "../../types/domain";

export type NewVehicleTireInput = {
  vehicle_id: string;
  name: string;
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  tire_type: TireType;
  dot?: string | null;
  is_currently_fitted?: boolean;
};

export function formatTireDimensions(
  width: number,
  aspectRatio: number,
  diameter: number,
): string {
  return `${width}/${aspectRatio} R${diameter}`;
}

export type ListVehicleTiresOptions = {
  /** When set (e.g. free plan), return first N: is_currently_fitted desc, then created_at asc. */
  limit?: number;
};

export async function listVehicleTires(
  vehicleId: string,
  options?: ListVehicleTiresOptions,
): Promise<VehicleTire[]> {
  let query = supabase
    .from("tires")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("is_currently_fitted", { ascending: false })
    .order("created_at", { ascending: true });
  if (options?.limit != null) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VehicleTire[];
}

export async function getVehicleTire(id: string): Promise<VehicleTire> {
  const { data, error } = await supabase
    .from("tires")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as VehicleTire;
}

const MAX_FITTED_TIRES_PER_VEHICLE = 2;

async function countFittedTires(vehicleId: string, excludeId?: string): Promise<number> {
  let query = supabase
    .from("tires")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("is_currently_fitted", true);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function createVehicleTire(
  input: NewVehicleTireInput,
): Promise<VehicleTire> {
  const { data, error } = await supabase.rpc("create_tire", {
    p_vehicle_id: input.vehicle_id,
    p_name: input.name,
    p_width_mm: input.width_mm,
    p_aspect_ratio: input.aspect_ratio,
    p_diameter_inch: input.diameter_inch,
    p_tire_type: input.tire_type,
    p_dot: input.dot ?? null,
    p_is_currently_fitted: input.is_currently_fitted ?? false,
  });
  if (error) {
    // Normalize fitted limit to app-friendly error code.
    if ((error.message ?? "").includes("FITTED_TIRE_LIMIT_REACHED")) {
      throw new Error("FITTED_TIRE_LIMIT_REACHED");
    }
    throw error;
  }
  return data as VehicleTire;
}

export async function updateVehicleTire(
  id: string,
  patch: Partial<NewVehicleTireInput>,
): Promise<VehicleTire> {
  if (patch.is_currently_fitted === true) {
    let vehicleId = patch.vehicle_id;
    if (!vehicleId) {
      const existing = await getVehicleTire(id);
      vehicleId = existing.vehicle_id;
    }
    const fittedCount = await countFittedTires(vehicleId, id);
    if (fittedCount >= MAX_FITTED_TIRES_PER_VEHICLE) {
      throw new Error("FITTED_TIRE_LIMIT_REACHED");
    }
  }
  const { data, error } = await supabase
    .from("tires")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as VehicleTire;
}

export async function deleteVehicleTire(id: string): Promise<void> {
  const { error } = await supabase.from("tires").delete().eq("id", id);
  if (error) throw error;
}
