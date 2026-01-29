import { supabase } from "../supabase/client";
import { fetchBlob, randomId } from "../storage/uploadUtils";
import * as ImageManipulator from "expo-image-manipulator";

const BUCKET = "report-photos";

export type TempReportPhoto = {
  storage_path: string;
  display_order: number;
  local_uri?: string; // For preview before upload
};

/**
 * Uploads a temporary photo for a report
 * The photo is stored in: {report_id}/{timestamp}-{randomId}.jpg
 * All photos are converted to JPEG format for maximum compatibility
 * @param reportId The report ID (must exist in database)
 * @param fileUri Local file URI
 * @param displayOrder Display order for the photo
 */
export async function uploadReportPhoto(params: {
  reportId: string;
  fileUri: string;
  displayOrder: number;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<TempReportPhoto> {
  // Convert all photos to JPEG for maximum compatibility
  const manipulated = await ImageManipulator.manipulateAsync(
    params.fileUri,
    [], // No transformations, just conversion
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );

  const storagePath = `${params.reportId}/${Date.now()}-${randomId()}.jpg`;

  const fileData = await fetchBlob(manipulated.uri);

  // Upload new photo as JPEG
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileData, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist, provide helpful error message
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

  return {
    storage_path: storagePath,
    display_order: params.displayOrder,
  };
}

/**
 * Uploads multiple temporary photos for a report
 */
export async function uploadReportPhotos(params: {
  reportId: string;
  photos: Array<{
    fileUri: string;
    displayOrder: number;
    mimeType?: string | null;
    fileName?: string | null;
  }>;
}): Promise<TempReportPhoto[]> {
  const uploadPromises = params.photos.map((photo, index) =>
    uploadReportPhoto({
      reportId: params.reportId,
      fileUri: photo.fileUri,
      displayOrder: photo.displayOrder,
      mimeType: photo.mimeType,
      fileName: photo.fileName,
    }),
  );

  return Promise.all(uploadPromises);
}

/**
 * Deletes a temporary report photo
 */
export async function deleteReportPhoto(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) throw error;
}

/**
 * Deletes multiple temporary report photos
 */
export async function deleteReportPhotos(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths);

  if (error) throw error;
}

/**
 * Gets public URL for a report photo
 * Note: Bucket is public, so we use public URLs directly
 */
export function getReportPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
