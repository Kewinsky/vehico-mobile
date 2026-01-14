import type { VehicleDocument } from '../../types/domain';
import { supabase } from '../supabase/client';

function inferContentType(params: { uri: string; mimeType?: string | null; fileName?: string | null }): string {
  if (params.mimeType) return params.mimeType;
  const lower = (params.fileName ?? params.uri).toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function inferExtension(params: { uri: string; contentType: string; fileName?: string | null }): string {
  const lower = (params.fileName ?? params.uri).toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot >= 0 && dot < lower.length - 1) return lower.slice(dot + 1);
  if (params.contentType === 'image/png') return 'png';
  if (params.contentType === 'image/webp') return 'webp';
  if (params.contentType === 'image/jpeg') return 'jpg';
  if (params.contentType === 'application/pdf') return 'pdf';
  return 'bin';
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function listVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleDocument[];
}

export async function uploadVehicleDocument(params: {
  vehicleId: string;
  fileUri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<VehicleDocument> {
  const contentType = inferContentType({ uri: params.fileUri, mimeType: params.mimeType, fileName: params.fileName });
  const bucket = contentType.startsWith('image/') ? 'images' : 'documents';
  const ext = inferExtension({ uri: params.fileUri, contentType, fileName: params.fileName });
  const storagePath = `${params.vehicleId}/vehicle_documents/${Date.now()}-${randomId()}.${ext}`;

  const res = await fetch(params.fileUri);
  const blob = await res.blob();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: params.vehicleId,
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function deleteVehicleDocument(doc: VehicleDocument): Promise<void> {
  const { error: storageError } = await supabase.storage.from(doc.storage_bucket).remove([doc.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('vehicle_documents').delete().eq('id', doc.id);
  if (error) throw error;
}

