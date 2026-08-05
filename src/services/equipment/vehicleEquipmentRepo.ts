import { supabase } from "../supabase/client";
import type { VehicleEquipment } from "../../types/domain";
import type { VehicleEquipmentPresetKey } from "../../constants/vehicleEquipmentPresets";

export type VehicleEquipmentDraftItem = {
  preset_key: VehicleEquipmentPresetKey | null;
  label: string;
};

export async function listVehicleEquipment(
  vehicleId: string,
): Promise<VehicleEquipment[]> {
  const { data, error } = await supabase
    .from("vehicle_equipment")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as VehicleEquipment[];
}

/** Replace the whole checklist in one write cycle (delete + insert). */
export async function replaceVehicleEquipment(
  vehicleId: string,
  items: VehicleEquipmentDraftItem[],
): Promise<VehicleEquipment[]> {
  const { error: deleteError } = await supabase
    .from("vehicle_equipment")
    .delete()
    .eq("vehicle_id", vehicleId);

  if (deleteError) throw deleteError;

  if (items.length === 0) return [];

  const rows = items.map((item) => ({
    vehicle_id: vehicleId,
    preset_key: item.preset_key,
    label: item.label.trim(),
  }));

  const { data, error } = await supabase
    .from("vehicle_equipment")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return ((data ?? []) as VehicleEquipment[]).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}
