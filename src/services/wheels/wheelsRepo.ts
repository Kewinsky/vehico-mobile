import { supabase } from "../supabase/client";
import type { VehicleWheel } from "../../types/domain";

export type NewVehicleWheelInput = {
  vehicle_id: string;
  name: string;
  width_inch: number;
  diameter_inch: number;
  et_offset?: number | null;
  bolt_pattern?: string | null;
  center_bore_mm?: number | null;
  bolt_type?: string | null;
  weight_kg?: number | null;
  is_currently_fitted?: boolean;
};

export function formatWheelDimensions(width: number, diameter: number): string {
  return `${width}J R${diameter}`;
}

export type ListVehicleWheelsOptions = {
  /** When set (e.g. free plan), return first N: is_currently_fitted desc, then created_at asc. */
  limit?: number;
};

export async function listVehicleWheels(
  vehicleId: string,
  options?: ListVehicleWheelsOptions,
): Promise<VehicleWheel[]> {
  let query = supabase
    .from("wheels")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("is_currently_fitted", { ascending: false })
    .order("created_at", { ascending: true });
  if (options?.limit != null) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VehicleWheel[];
}

export async function getVehicleWheel(id: string): Promise<VehicleWheel> {
  const { data, error } = await supabase
    .from("wheels")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as VehicleWheel;
}

const MAX_FITTED_WHEELS_PER_VEHICLE = 2;

async function countFittedWheels(vehicleId: string, excludeId?: string): Promise<number> {
  let query = supabase
    .from("wheels")
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

export async function createVehicleWheel(
  input: NewVehicleWheelInput,
): Promise<VehicleWheel> {
  if (input.is_currently_fitted) {
    const fittedCount = await countFittedWheels(input.vehicle_id);
    if (fittedCount >= MAX_FITTED_WHEELS_PER_VEHICLE) {
      throw new Error("FITTED_WHEEL_LIMIT_REACHED");
    }
  }
  const { data, error } = await supabase
    .from("wheels")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as VehicleWheel;
}

export async function updateVehicleWheel(
  id: string,
  patch: Partial<NewVehicleWheelInput>,
): Promise<VehicleWheel> {
  if (patch.is_currently_fitted === true) {
    let vehicleId = patch.vehicle_id;
    if (!vehicleId) {
      const existing = await getVehicleWheel(id);
      vehicleId = existing.vehicle_id;
    }
    const fittedCount = await countFittedWheels(vehicleId, id);
    if (fittedCount >= MAX_FITTED_WHEELS_PER_VEHICLE) {
      throw new Error("FITTED_WHEEL_LIMIT_REACHED");
    }
  }
  const { data, error } = await supabase
    .from("wheels")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as VehicleWheel;
}

export async function deleteVehicleWheel(id: string): Promise<void> {
  const { error } = await supabase.from("wheels").delete().eq("id", id);
  if (error) throw error;
}
