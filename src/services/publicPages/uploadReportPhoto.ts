import type { VehiclePhoto } from "../../types/domain";
import { supabase } from "../supabase/client";
import {
  compressImageForUpload,
  UPLOAD_IMAGE_CACHE_CONTROL,
} from "../storage/compressImageForUpload";
import { fetchBlob, randomId } from "../storage/uploadUtils";

const BUCKET = "report-photos";

export type ReportPhotoUpload = {
  storage_path: string;
  display_order: number;
};

export type ReportPhotoSourceItem =
  | {
      kind: "vehicle";
      vehiclePhoto: VehiclePhoto;
      displayOrder: number;
    }
  | {
      kind: "local";
      fileUri: string;
      displayOrder: number;
      mimeType?: string | null;
      fileName?: string | null;
    };

function mapBucketUploadError(uploadError: { message?: string }): never {
  if (
    uploadError.message?.includes("not found") ||
    uploadError.message?.includes("bucket")
  ) {
    throw new Error(
      `Storage bucket "${BUCKET}" not found. Please create it in Supabase Dashboard → Storage → New bucket.`,
    );
  }
  throw uploadError;
}

export async function uploadReportPhoto(params: {
  reportId: string;
  fileUri: string;
  displayOrder: number;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<ReportPhotoUpload> {
  const compressedUri = await compressImageForUpload(params.fileUri);

  const storagePath = `${params.reportId}/${Date.now()}-${randomId()}.jpg`;
  const fileData = await fetchBlob(compressedUri);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileData, {
      contentType: "image/jpeg",
      cacheControl: UPLOAD_IMAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (uploadError) mapBucketUploadError(uploadError);

  return {
    storage_path: storagePath,
    display_order: params.displayOrder,
  };
}

export async function copyVehiclePhotoToReport(params: {
  reportId: string;
  photo: Pick<VehiclePhoto, "storage_bucket" | "storage_path">;
  displayOrder: number;
}): Promise<ReportPhotoUpload> {
  const { data: publicUrlData } = supabase.storage
    .from(params.photo.storage_bucket)
    .getPublicUrl(params.photo.storage_path);
  const fileData = await fetchBlob(publicUrlData.publicUrl);

  const storagePath = `${params.reportId}/${Date.now()}-${randomId()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileData, {
      contentType: "image/jpeg",
      cacheControl: UPLOAD_IMAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (uploadError) mapBucketUploadError(uploadError);

  return {
    storage_path: storagePath,
    display_order: params.displayOrder,
  };
}

export async function uploadAllReportPhotos(params: {
  reportId: string;
  items: ReportPhotoSourceItem[];
}): Promise<ReportPhotoUpload[]> {
  const sorted = [...params.items].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const uploads: ReportPhotoUpload[] = [];

  for (const item of sorted) {
    if (item.kind === "vehicle") {
      uploads.push(
        await copyVehiclePhotoToReport({
          reportId: params.reportId,
          photo: item.vehiclePhoto,
          displayOrder: item.displayOrder,
        }),
      );
    } else {
      uploads.push(
        await uploadReportPhoto({
          reportId: params.reportId,
          fileUri: item.fileUri,
          displayOrder: item.displayOrder,
          mimeType: item.mimeType,
          fileName: item.fileName,
        }),
      );
    }
  }

  return uploads;
}
