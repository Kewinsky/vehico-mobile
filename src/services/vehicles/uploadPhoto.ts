import type { VehiclePhoto } from "../../types/domain";
import { supabase } from "../supabase/client";
import { fetchBlob, randomId } from "../storage/uploadUtils";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_PHOTOS = 6;

/**
 * Lists all photos for a vehicle, ordered by display_order
 */
export async function listVehiclePhotos(
  vehicleId: string
): Promise<VehiclePhoto[]> {
  const { data, error } = await supabase
    .from("vehicle_photos")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VehiclePhoto[];
}

/**
 * Uploads a photo for a vehicle and returns the VehiclePhoto
 * The photo is stored in: {vehicleId}/{timestamp}-{randomId}.jpg
 * Maximum 6 photos per vehicle
 * All photos are converted to JPEG format for maximum compatibility
 */
export async function uploadVehiclePhoto(params: {
  vehicleId: string;
  fileUri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<VehiclePhoto> {
  // Check current count
  const existing = await listVehiclePhotos(params.vehicleId);
  if (existing.length >= MAX_PHOTOS) {
    throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);
  }

  // Convert all photos to JPEG for maximum compatibility
  const manipulated = await ImageManipulator.manipulateAsync(
    params.fileUri,
    [], // No transformations, just conversion
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  const bucket = "images";
  const storagePath = `${params.vehicleId}/${Date.now()}-${randomId()}.jpg`;

  const fileData = await fetchBlob(manipulated.uri);

  // Upload new photo as JPEG
  const { error: uploadError } = await supabase.storage
    .from(bucket)
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
        `Storage bucket "${bucket}" not found. Please create it in Supabase Dashboard → Storage → New bucket.`
      );
    }
    throw uploadError;
  }

  // Get the next display_order
  const nextOrder = existing.length;

  // Insert into database
  const { data, error } = await supabase
    .from("vehicle_photos")
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
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(photo.storage_bucket)
    .remove([photo.storage_path]);
  if (storageError) throw storageError;

  // Delete from database
  const { error } = await supabase
    .from("vehicle_photos")
    .delete()
    .eq("id", photo.id);
  if (error) throw error;

  // Reorder remaining photos
  const remaining = await listVehiclePhotos(photo.vehicle_id);
  for (let i = 0; i < remaining.length; i++) {
    await supabase
      .from("vehicle_photos")
      .update({ display_order: i })
      .eq("id", remaining[i].id);
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
  // Update display_order for each photo based on its position in the array
  await Promise.all(
    photoIds.map((photoId, index) =>
      supabase
        .from("vehicle_photos")
        .update({ display_order: index })
        .eq("id", photoId)
        .eq("vehicle_id", vehicleId)
    )
  );
}

/**
 * Gets public URL for a vehicle photo
 * Note: Bucket is public, so we use public URLs directly
 */
export function getVehiclePhotoUrl(photo: VehiclePhoto): string {
  const { data } = supabase.storage
    .from(photo.storage_bucket)
    .getPublicUrl(photo.storage_path);
  return data.publicUrl;
}
