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

export async function listVehicleWheels(
  vehicleId: string,
): Promise<VehicleWheel[]> {
  const { data, error } = await supabase
    .from("wheels")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("is_currently_fitted", { ascending: false })
    .order("created_at", { ascending: false });
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

export async function createVehicleWheel(
  input: NewVehicleWheelInput,
): Promise<VehicleWheel> {
  if (input.is_currently_fitted) {
    await supabase
      .from("wheels")
      .update({ is_currently_fitted: false })
      .eq("vehicle_id", input.vehicle_id);
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
  if (patch.is_currently_fitted && patch.vehicle_id) {
    await supabase
      .from("wheels")
      .update({ is_currently_fitted: false })
      .eq("vehicle_id", patch.vehicle_id)
      .neq("id", id);
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
