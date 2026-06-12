import { supabase } from "../supabase/client";
import { ENV } from "../../config/env";
import type { Currency, PublicReportSnapshot } from "../../types/domain";
import type { ReportPhotoUpload } from "./uploadReportPhoto";

const REPORT_PHOTOS_BUCKET = "report-photos";

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
  currency?: Currency;
};

export async function generatePublicPageWithOptions(
  vehicleId: string,
  reportOptions: ReportOptions,
): Promise<PublicReportSnapshot> {
  const { data, error } = await supabase.rpc("create_report_snapshot", {
    p_vehicle_id: vehicleId,
    p_report_options: reportOptions,
  });

  if (error) throw error;
  return data as PublicReportSnapshot;
}

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

export async function updatePublicReportPhotos(
  reportId: string,
  photos: ReportPhotoUpload[],
): Promise<PublicReportSnapshot> {
  const { data, error } = await supabase.rpc("update_report_photos", {
    p_report_id: reportId,
    p_photos_data: photos.map((p) => ({
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

async function deleteReportPhotosStorage(reportId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from(REPORT_PHOTOS_BUCKET)
    .list(reportId);
  if (listError) return;

  const pathsToRemove = (files ?? [])
    .filter((f) => f.name)
    .map((f) => `${reportId}/${f.name}`);
  if (pathsToRemove.length === 0) return;

  const { error: removeError } = await supabase.storage
    .from(REPORT_PHOTOS_BUCKET)
    .remove(pathsToRemove);
  if (removeError) throw removeError;
}

export async function deletePublicReport(reportId: string): Promise<void> {
  await deleteReportPhotosStorage(reportId);

  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) throw error;
}
