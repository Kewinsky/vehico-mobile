import type { VehicleGalleryPhoto } from '../../types/domain';
import { supabase } from '../supabase/client';
import { fetchBlob, randomId } from '../storage/uploadUtils';

export async function listVehiclePhotos(vehicleId: string): Promise<VehicleGalleryPhoto[]> {
  const { data, error } = await supabase
    .from('vehicle_photos')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleGalleryPhoto[];
}

export async function uploadVehiclePhoto(params: { vehicleId: string; fileUri: string }): Promise<VehicleGalleryPhoto> {
  const bucket = 'images';
  const storagePath = `${params.vehicleId}/vehicle_photos/${Date.now()}-${randomId()}.jpg`;

  const fileData = await fetchBlob(params.fileUri);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('vehicle_photos')
    .insert({
      vehicle_id: params.vehicleId,
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VehicleGalleryPhoto;
}

export async function deleteVehiclePhoto(photo: VehicleGalleryPhoto): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(photo.storage_bucket)
    .remove([photo.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('vehicle_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

