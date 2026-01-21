import type { Attachment, AttachmentType } from "../../types/domain";
import { supabase } from "../supabase/client";
import {
  fetchBlob,
  inferContentType,
  inferExtension,
  randomId,
} from "../storage/uploadUtils";

export type VehicleAttachment = Attachment & {
  serviceEntryTitle: string | null;
};

export async function listAttachments(
  serviceEntryId: string
): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("service_entry_id", serviceEntryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function uploadAttachment(params: {
  serviceEntryId: string;
  vehicleId: string;
  fileUri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<Attachment> {
  const contentType = inferContentType({
    uri: params.fileUri,
    mimeType: params.mimeType,
    fileName: params.fileName,
  });
  // All attachments go to documents bucket
  const bucket = "documents";
  const attachmentType: AttachmentType =
    contentType.startsWith("image/") ? "photo" : "receipt";
  const ext = inferExtension({
    uri: params.fileUri,
    contentType,
    fileName: params.fileName,
  });
  const storagePath = `service_entry_attachments/${params.vehicleId}/${
    params.serviceEntryId
  }/${Date.now()}-${randomId()}.${ext}`;

  const fileData = await fetchBlob(params.fileUri);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      service_entry_id: params.serviceEntryId,
      // UI treats attachments as generic; this is only metadata for future filtering.
      type: attachmentType,
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .select("*")
    .single();
  if (error) throw error;

  return data as Attachment;
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSec = 60 * 10
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(att.storage_bucket)
    .remove([att.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", att.id);
  if (error) throw error;
}

export async function listVehicleAttachments(
  vehicleId: string
): Promise<VehicleAttachment[]> {
  // Join via service_entries to filter by vehicle_id
  const { data, error } = await supabase
    .from("attachments")
    .select("*, service_entries!inner(vehicle_id,title)")
    .eq("service_entries.vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    // Keep service entry title for Documents UI (non-domain field).
    const { service_entries, ...rest } = row;
    return {
      ...rest,
      serviceEntryTitle: service_entries?.title ?? null,
    };
  });
}
