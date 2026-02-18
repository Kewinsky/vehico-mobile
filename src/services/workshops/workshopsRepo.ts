import { supabase } from "../supabase/client";
import type { Workshop, WorkshopType } from "../../types/domain";
import type { ServiceEntry } from "../../types/domain";

export type NewWorkshopInput = {
  name: string;
  workshop_type: WorkshopType;
  phone_number?: string | null;
  address?: string | null;
};

export type ListWorkshopsOptions = {
  /** When set (e.g. free plan), return only first N by created_at. Ignored if freePlanWorkshopIds is set. */
  limit?: number;
  /** Free plan: return only workshops whose id is in this list (stable set, no auto-reveal). */
  freePlanWorkshopIds?: string[] | null;
};

export async function listWorkshops(
  options?: ListWorkshopsOptions,
): Promise<Workshop[]> {
  const ids = options?.freePlanWorkshopIds;
  if (ids != null) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Workshop[];
  }
  if (options?.limit != null) {
    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(options.limit);
    if (error) throw error;
    return (data ?? []) as Workshop[];
  }
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Workshop[];
}

export async function getWorkshop(id: string): Promise<Workshop> {
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Workshop;
}

export async function createWorkshop(
  input: NewWorkshopInput,
): Promise<Workshop> {
  const { data, error } = await supabase.rpc("create_workshop", {
    p_name: input.name,
    p_workshop_type: input.workshop_type,
    p_phone_number: input.phone_number ?? null,
    p_address: input.address ?? null,
  });
  if (error) throw error;
  return data as Workshop;
}

export async function updateWorkshop(
  id: string,
  patch: Partial<NewWorkshopInput>,
): Promise<Workshop> {
  const { data, error } = await supabase
    .from("workshops")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Workshop;
}

export async function deleteWorkshop(id: string): Promise<void> {
  const { error } = await supabase.from("workshops").delete().eq("id", id);
  if (error) throw error;
}
