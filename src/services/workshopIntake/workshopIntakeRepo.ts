import { supabase } from "../supabase/client";
import type { ServiceEntry, Vehicle } from "../../types/domain";
import { ENV } from "../../config/env";

export function getWorkshopIntakeUrl(token: string): string {
  return `${ENV.REPORTS_APP_URL}/w/${token}`;
}

export async function setVehicleIntakeEnabled(
  vehicleId: string,
  enabled: boolean,
): Promise<Vehicle> {
  const { data, error } = await supabase.rpc("set_vehicle_intake_enabled", {
    p_vehicle_id: vehicleId,
    p_enabled: enabled,
  });
  if (error) throw error;
  return data as Vehicle;
}

export async function regenerateVehicleIntakeToken(
  vehicleId: string,
): Promise<Vehicle> {
  const { data, error } = await supabase.rpc("regenerate_vehicle_intake_token", {
    p_vehicle_id: vehicleId,
  });
  if (error) throw error;
  return data as Vehicle;
}

export async function listPendingWorkshopEntries(
  vehicleId: string,
): Promise<ServiceEntry[]> {
  const { data, error } = await supabase
    .from("service_entries")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("source", "workshop")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ServiceEntry[];
}

export async function countPendingWorkshopEntries(
  vehicleId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("service_entries")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("source", "workshop")
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

export async function approveWorkshopServiceEntry(
  entryId: string,
): Promise<ServiceEntry> {
  const { data, error } = await supabase.rpc("approve_workshop_service_entry", {
    p_entry_id: entryId,
  });
  if (error) throw error;
  return data as ServiceEntry;
}

export async function rejectWorkshopServiceEntry(
  entryId: string,
): Promise<void> {
  const { error } = await supabase.rpc("reject_workshop_service_entry", {
    p_entry_id: entryId,
  });
  if (error) throw error;
}
