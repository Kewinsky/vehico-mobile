import type { VehicleDocument } from "../../types/domain";
import { supabase } from "../supabase/client";
import {
  fetchBlob,
  inferContentType,
  inferExtension,
  randomId,
} from "../storage/uploadUtils";

export async function listVehicleDocuments(
  vehicleId: string
): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleDocument[];
}

export async function uploadVehicleDocument(params: {
  vehicleId: string;
  fileUri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<VehicleDocument> {
  const contentType = inferContentType({
    uri: params.fileUri,
    mimeType: params.mimeType,
    fileName: params.fileName,
  });
  const bucket = contentType.startsWith("image/") ? "images" : "documents";
  const ext = inferExtension({
    uri: params.fileUri,
    contentType,
    fileName: params.fileName,
  });
  const storagePath = `${
    params.vehicleId
  }/vehicle_documents/${Date.now()}-${randomId()}.${ext}`;

  const fileData = await fetchBlob(params.fileUri);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vehicle_documents")
    .insert({
      vehicle_id: params.vehicleId,
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function deleteVehicleDocument(
  doc: VehicleDocument
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(doc.storage_bucket)
    .remove([doc.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("vehicle_documents")
    .delete()
    .eq("id", doc.id);
  if (error) throw error;
}
