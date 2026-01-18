import { supabase } from "../supabase/client";
import { ENV } from "../../config/env";
import type { PublicPage } from "../../types/domain";

export async function generateOrGetPublicPage(
  vehicleId: string
): Promise<PublicPage> {
  // Check if public page already exists
  const { data: existing, error: checkError } = await supabase
    .from("public_pages")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    return existing as PublicPage;
  }

  // Create new public page
  const { data, error } = await supabase
    .from("public_pages")
    .insert({ vehicle_id: vehicleId })
    .select("*")
    .single();

  if (error) throw error;
  return data as PublicPage;
}

export async function getPublicPageUrl(publicId: string): Promise<string> {
  return `${ENV.REPORTS_APP_URL}/report/${publicId}`;
}

export async function deletePublicPage(vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from("public_pages")
    .delete()
    .eq("vehicle_id", vehicleId);

  if (error) throw error;
}
