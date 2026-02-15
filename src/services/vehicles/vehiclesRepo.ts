import { supabase } from "../supabase/client";
import type { Vehicle, VehicleType } from "../../types/domain";

type NewVehicleInput = {
  type: VehicleType;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
  mileage?: number | null;
  engine_capacity?: number | null;
  power_hp?: number | null;
  fuel_type?: "petrol" | "diesel" | "hybrid" | "electric" | "lpg" | null;
  transmission?: "manual" | "automatic" | null;
  drive_type?: "FWD" | "RWD" | "AWD" | null;
  notes?: string | null;
  insurance_valid_until?: string | null;
  inspection_valid_until?: string | null;
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
  const { data, error } = await supabase.rpc("create_vehicle", {
    p_type: input.type,
    p_vin: input.vin,
    p_make: input.make,
    p_model: input.model,
    p_production_year: input.production_year,
    p_mileage: input.mileage ?? null,
    p_engine_capacity: input.engine_capacity ?? null,
    p_power_hp: input.power_hp ?? null,
    p_fuel_type: input.fuel_type ?? null,
    p_transmission: input.transmission ?? null,
    p_drive_type: input.drive_type ?? null,
    p_notes: input.notes ?? null,
    p_insurance_valid_until: input.insurance_valid_until ?? null,
    p_inspection_valid_until: input.inspection_valid_until ?? null,
  });
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(
  vehicleId: string,
  patch: UpdateVehicleInput,
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
