import { supabase } from "../supabase/client";
import type { ServiceEntry, ServiceEntryCategory } from "../../types/domain";

type NewServiceEntryInput = {
  vehicle_id: string;
  service_date: string;
  mileage: number | null;
  category: ServiceEntryCategory;
  title: string;
  description: string;
  cost: number | null;
  workshop_id?: string | null;
};

export async function listServiceEntries(
  vehicleId: string,
): Promise<ServiceEntry[]> {
  const { data, error } = await supabase
    .from("service_entries")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ServiceEntry[];
}

export async function createServiceEntry(
  input: NewServiceEntryInput,
): Promise<ServiceEntry> {
  const { data, error } = await supabase
    .from("service_entries")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ServiceEntry;
}

export async function getServiceEntry(id: string): Promise<ServiceEntry> {
  const { data, error } = await supabase
    .from("service_entries")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ServiceEntry;
}

export async function updateServiceEntry(
  id: string,
  patch: Partial<NewServiceEntryInput>,
): Promise<ServiceEntry> {
  const { data, error } = await supabase
    .from("service_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ServiceEntry;
}

export async function deleteServiceEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("service_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
