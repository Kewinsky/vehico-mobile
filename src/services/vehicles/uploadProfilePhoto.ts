import { supabase } from "../supabase/client";
import { fetchBlob } from "../storage/uploadUtils";
import { createSignedUrl } from "../attachments/attachmentsRepo";

/**
 * Uploads a profile photo for a vehicle and returns the signed URL
 * The photo is stored in: {vehicleId}/profile_photo.jpg
 */
export async function uploadVehicleProfilePhoto(params: {
  vehicleId: string;
  fileUri: string;
}): Promise<string> {
  const bucket = "images";
  const storagePath = `${params.vehicleId}/profile_photo.jpg`;

  const fileData = await fetchBlob(params.fileUri);

  // First, try to remove existing profile photo if it exists
  // This avoids RLS issues with upsert
  try {
    await supabase.storage.from(bucket).remove([storagePath]);
  } catch {
    // Ignore errors if file doesn't exist
  }

  // Upload new photo
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  // Get signed URL for the uploaded photo with high quality (no compression)
  // Using getPublicUrl would be better for quality, but requires public bucket
  // For now, we use signed URL with long expiry
  const signedUrl = await createSignedUrl(bucket, storagePath, 60 * 60 * 24 * 365); // 1 year expiry
  return signedUrl;
}

/**
 * Deletes the profile photo for a vehicle
 */
export async function deleteVehicleProfilePhoto(vehicleId: string): Promise<void> {
  const bucket = "images";
  const storagePath = `${vehicleId}/profile_photo.jpg`;

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw error;
}
