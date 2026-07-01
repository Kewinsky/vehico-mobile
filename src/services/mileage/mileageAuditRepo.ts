import { supabase } from "../supabase/client";
import type { MileageAudit, MileageAuditSource } from "../../types/domain";

type NewMileageAuditInput = {
  vehicle_id: string;
  reading_date: string;
  mileage: number;
  source?: MileageAuditSource;
};

export async function listMileageAudit(
  vehicleId: string,
): Promise<MileageAudit[]> {
  const { data, error } = await supabase
    .from("mileage_audit")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("reading_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MileageAudit[];
}

export async function insertMileageAudit(
  input: NewMileageAuditInput,
): Promise<MileageAudit> {
  const { data, error } = await supabase
    .from("mileage_audit")
    .insert({
      vehicle_id: input.vehicle_id,
      reading_date: input.reading_date.slice(0, 10),
      mileage: input.mileage,
      source: input.source ?? "profile",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as MileageAudit;
}
