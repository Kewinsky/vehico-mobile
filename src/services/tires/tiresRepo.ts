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

export async function listVehicleTires(
  vehicleId: string,
): Promise<VehicleTire[]> {
  const { data, error } = await supabase
    .from("tires")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("is_currently_fitted", { ascending: false })
    .order("created_at", { ascending: false });
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

export async function createVehicleTire(
  input: NewVehicleTireInput,
): Promise<VehicleTire> {
  if (input.is_currently_fitted) {
    await supabase
      .from("tires")
      .update({ is_currently_fitted: false })
      .eq("vehicle_id", input.vehicle_id);
  }
  const { data, error } = await supabase
    .from("tires")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as VehicleTire;
}

export async function updateVehicleTire(
  id: string,
  patch: Partial<NewVehicleTireInput>,
): Promise<VehicleTire> {
  if (patch.is_currently_fitted && patch.vehicle_id) {
    await supabase
      .from("tires")
      .update({ is_currently_fitted: false })
      .eq("vehicle_id", patch.vehicle_id)
      .neq("id", id);
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
