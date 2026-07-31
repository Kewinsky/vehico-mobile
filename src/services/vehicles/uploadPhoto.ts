import type { VehiclePhoto } from "../../types/domain";
import { supabase } from "../supabase/client";
import {
  compressImageForUpload,
  UPLOAD_IMAGE_CACHE_CONTROL,
} from "../storage/compressImageForUpload";
import { fetchBlob, randomId } from "../storage/uploadUtils";

const DEFAULT_MAX_PHOTOS = 6;

export type ListVehiclePhotosOptions = {
  /** When set (e.g. free plan), return only first N by display_order. */
  limit?: number;
};

/**
 * Lists all photos for a vehicle, ordered by display_order
 */
export async function listVehiclePhotos(
  vehicleId: string,
  options?: ListVehiclePhotosOptions,
): Promise<VehiclePhoto[]> {
  let query = supabase
    .from("photos")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("display_order", { ascending: true });
  if (options?.limit != null) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VehiclePhoto[];
}

/**
 * Lists photos for multiple vehicles in a single request, grouped by vehicle_id.
 * This avoids N+1 queries when rendering a vehicle list with thumbnails.
 */
export async function listVehiclePhotosForVehicles(
  vehicleIds: string[],
  options?: ListVehiclePhotosOptions,
): Promise<Map<string, VehiclePhoto[]>> {
  const map = new Map<string, VehiclePhoto[]>();
  if (vehicleIds.length === 0) return map;

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .in("vehicle_id", vehicleIds)
    .order("vehicle_id", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) throw error;

  for (const row of (data ?? []) as VehiclePhoto[]) {
    const bucket = map.get(row.vehicle_id) ?? [];
    if (options?.limit != null && bucket.length >= options.limit) continue;
    bucket.push(row);
    map.set(row.vehicle_id, bucket);
  }

  return map;
}

/**
 * Uploads a photo for a vehicle and returns the VehiclePhoto
 * The photo is stored in: {vehicleId}/{timestamp}-{randomId}.jpg
 * Maximum photos per vehicle is determined by user's plan (default: 6 for free, 40 for premium)
 * All photos are converted to JPEG format for maximum compatibility
 */
export async function uploadVehiclePhoto(params: {
  vehicleId: string;
  fileUri: string;
  mimeType?: string | null;
  fileName?: string | null;
  maxPhotos?: number; // Optional limit override (from entitlements)
}): Promise<VehiclePhoto> {
  const maxPhotos = params.maxPhotos ?? DEFAULT_MAX_PHOTOS;
  // Check current count
  const existing = await listVehiclePhotos(params.vehicleId);
  if (existing.length >= maxPhotos) {
    throw new Error(`Maximum ${maxPhotos} photos allowed`);
  }

  // Resize + JPEG compress to cut Storage egress on every later download
  const compressedUri = await compressImageForUpload(params.fileUri);

  const bucket = "images";
  const storagePath = `${params.vehicleId}/${Date.now()}-${randomId()}.jpg`;

  const fileData = await fetchBlob(compressedUri);

  // Upload new photo as JPEG
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, {
      contentType: "image/jpeg",
      cacheControl: UPLOAD_IMAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist, provide helpful error message
    if (
      uploadError.message?.includes("not found") ||
      uploadError.message?.includes("bucket")
    ) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Please create it in Supabase Dashboard → Storage → New bucket.`
      );
    }
    throw uploadError;
  }

  // Get the next display_order
  const nextOrder = existing.length;

  // Insert into database
  const { data, error } = await supabase
    .from("photos")
    .insert({
      vehicle_id: params.vehicleId,
      storage_bucket: bucket,
      storage_path: storagePath,
      display_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as VehiclePhoto;
}

/**
 * Deletes a photo for a vehicle
 */
export async function deleteVehiclePhoto(
  photo: VehiclePhoto
): Promise<void> {
  // Delete storage object via Storage API first.
  const { error: storageError } = await supabase.storage
    .from(photo.storage_bucket)
    .remove([photo.storage_path]);
  if (storageError) throw storageError;

  // Then delete metadata row from DB.
  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photo.id);
  if (error) {
    if (
      typeof error.message === "string" &&
      error.message.includes("Direct deletion from storage tables is not allowed")
    ) {
      throw new Error(
        "Photo delete is blocked by backend trigger configuration. Remove trigger `photos_delete_storage` and retry.",
      );
    }
    throw error;
  }
}

/**
 * Reorders vehicle photos by updating their display_order
 * @param vehicleId The vehicle ID
 * @param photoIds Array of photo IDs in the desired order
 */
export async function reorderVehiclePhotos(
  vehicleId: string,
  photoIds: string[]
): Promise<void> {
  // Update display_order for each photo based on its position in the array.
  // Supabase does not throw automatically on row-level errors, so inspect results.
  const results = await Promise.all(
    photoIds.map((photoId, index) =>
      supabase
        .from("photos")
        .update({ display_order: index })
        .eq("id", photoId)
        .eq("vehicle_id", vehicleId)
    )
  );
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
}

/**
 * Gets public URL for a vehicle photo.
 * Bucket is public – plain URLs only (no Image Transformations add-on).
 */
export function getVehiclePhotoUrl(photo: VehiclePhoto): string {
  const { data } = supabase.storage
    .from(photo.storage_bucket)
    .getPublicUrl(photo.storage_path);
  return data.publicUrl;
}
