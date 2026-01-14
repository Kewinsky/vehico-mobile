import type { Attachment, AttachmentType } from '../../types/domain';
import { supabase } from '../supabase/client';

function inferContentTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function listAttachments(serviceEntryId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('service_entry_id', serviceEntryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function uploadAttachment(params: {
  serviceEntryId: string;
  vehicleId: string;
  type: AttachmentType;
  fileUri: string;
}): Promise<Attachment> {
  const bucket = params.type === 'photo' ? 'images' : 'documents';
  const contentType = inferContentTypeFromUri(params.fileUri);
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${params.vehicleId}/${params.serviceEntryId}/${Date.now()}-${randomId()}.${ext}`;

  const res = await fetch(params.fileUri);
  const blob = await res.blob();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      service_entry_id: params.serviceEntryId,
      type: params.type,
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .select('*')
    .single();
  if (error) throw error;

  return data as Attachment;
}

export async function createSignedUrl(bucket: string, path: string, expiresInSec = 60 * 10) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

