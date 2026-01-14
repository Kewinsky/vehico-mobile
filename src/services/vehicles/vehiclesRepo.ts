import { supabase } from "../supabase/client";
import type { Vehicle, VehicleType } from "../../types/domain";

type NewVehicleInput = {
  type: VehicleType;
  title: string;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
};

type UpdateVehicleInput = Partial<NewVehicleInput>;

export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function getVehicle(vehicleId: string): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function createVehicle(input: NewVehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(
  vehicleId: string,
  patch: UpdateVehicleInput
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .update(patch)
    .eq("id", vehicleId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  // Hard delete: cascades to related tables via FK ON DELETE CASCADE.
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId);
  if (error) throw error;
}

// Backward-compatible alias (old naming)
export async function softDeleteVehicle(vehicleId: string): Promise<void> {
  return deleteVehicle(vehicleId);
}
