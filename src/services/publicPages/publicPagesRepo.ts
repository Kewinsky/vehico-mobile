import { supabase } from "../supabase/client";
import { ENV } from "../../config/env";
import type { PublicReportSnapshot } from "../../types/domain";

/**
 * Generates a new public report snapshot (always creates new, never reuses)
 * Enforces 3 snapshot limit per vehicle
 */
export async function generatePublicPage(
  vehicleId: string
): Promise<PublicReportSnapshot> {
  const { data, error } = await supabase.rpc(
    "create_public_report_snapshot",
    { p_vehicle_id: vehicleId }
  );

  if (error) throw error;
  return data as PublicReportSnapshot;
}

/**
 * Lists all snapshots (reports) for a vehicle, ordered by creation date (newest first)
 */
export async function listPublicPages(
  vehicleId: string
): Promise<PublicReportSnapshot[]> {
  const { data, error } = await supabase
    .from("public_report")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PublicReportSnapshot[];
}

/**
 * Gets snapshot data by public_id (for Next.js)
 */
export async function getPublicReportSnapshot(
  publicId: string
): Promise<PublicReportSnapshot | null> {
  const { data, error } = await supabase
    .from("public_report")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) throw error;
  return data as PublicReportSnapshot | null;
}

export async function getPublicPageUrl(publicId: string): Promise<string> {
  return `${ENV.REPORTS_APP_URL}/report/${publicId}`;
}

/**
 * Deletes a snapshot
 */
export async function deletePublicPage(snapshotId: string): Promise<void> {
  const { error } = await supabase
    .from("public_report")
    .delete()
    .eq("id", snapshotId);

  if (error) throw error;
}

/**
 * Gets the count of public reports for a vehicle
 */
export async function getPublicReportCount(
  vehicleId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("public_report")
    .select("*", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);

  if (error) throw error;
  return count ?? 0;
}
