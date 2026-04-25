import { supabase } from "../supabase/client";
import { ENV } from "../../config/env";
import type { PublicReportSnapshot } from "../../types/domain";
import type { TempReportPhoto } from "./uploadReportPhoto";

export type ReportOptions = {
  include_technical_data: boolean;
  include_insurance: boolean;
  include_inspection: boolean;
  include_notes: boolean;
  include_wheels: boolean;
  include_tires: boolean;
  include_service_history: boolean;
  include_service_stats: boolean;
  include_fueling_stats: boolean;
  include_photos: boolean;
  distance_unit?: "km" | "miles";
  fuel_unit?: "liters" | "gallons";
  currency?: "PLN" | "USD";
};

/**
 * Generates a new public report snapshot with custom options
 * @param vehicleId Vehicle ID
 * @param selectedVehiclePhotoIds Array of vehicle photo IDs to include (empty = all)
 * @param tempPhotos Array of temporary photos (already uploaded to report-photos bucket)
 * @param reportOptions Options for what to include in the report
 */
export async function generatePublicPageWithOptions(
  vehicleId: string,
  selectedVehiclePhotoIds: string[],
  tempPhotos: TempReportPhoto[],
  reportOptions: ReportOptions,
): Promise<PublicReportSnapshot> {
  const { data, error } = await supabase.rpc("create_report_snapshot", {
    p_vehicle_id: vehicleId,
    p_selected_vehicle_photo_ids:
      selectedVehiclePhotoIds.length > 0 ? selectedVehiclePhotoIds : [],
    p_temp_photos_data: tempPhotos.map((photo) => ({
      storage_path: photo.storage_path,
      display_order: photo.display_order,
    })),
    p_report_options: reportOptions,
  });

  if (error) throw error;
  return data as PublicReportSnapshot;
}

/**
 * Lists all snapshots (reports) for a vehicle, ordered by creation date (newest first)
 */
export async function listPublicPages(
  vehicleId: string,
): Promise<PublicReportSnapshot[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PublicReportSnapshot[];
}

export async function getPublicPageUrl(publicId: string): Promise<string> {
  return `${ENV.REPORTS_APP_URL}/report/${publicId}`;
}

/**
 * Merges temp photos into report snapshot after upload to report-photos bucket.
 * Call after: 1) create report, 2) upload temp photos.
 */
export async function updatePublicReportTempPhotos(
  reportId: string,
  tempPhotos: TempReportPhoto[],
): Promise<PublicReportSnapshot> {
  const { data, error } = await supabase.rpc("update_report_temp_photos", {
    p_report_id: reportId,
    p_temp_photos_data: tempPhotos.map((p) => ({
      storage_path: p.storage_path,
      display_order: p.display_order,
    })),
  });

  if (error) throw error;
  return data as PublicReportSnapshot;
}

export async function updatePublicReportTitle(
  snapshotId: string,
  title: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ title })
    .eq("id", snapshotId);
  if (error) throw error;
}
