import * as FileSystem from "expo-file-system/legacy";

import type { VehicleDocument } from "../../types/domain";
import {
  deleteLocalVehicleDocument,
  getLocalVehicleDocument,
  insertLocalVehicleDocument,
  listLocalVehicleDocuments,
  type LocalVehicleDocumentRow,
  updateLocalVehicleDocumentDescription,
} from "../localStorage/localDb";
import { deleteLocalFile, saveVehicleDocumentFile } from "../localStorage/localFiles";
import { supabase } from "../supabase/client";
import { fetchBlob, inferContentType, uuid } from "../storage/uploadUtils";

const DOCUMENTS_BUCKET = "documents";
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type CloudVehicleDocument = VehicleDocument & {
  original_name: string;
  content_type: string;
  size_bytes: number;
  upload_status: "uploading" | "ready";
};

function mapLocalDocument(
  row: LocalVehicleDocumentRow,
  uploadStatus: "uploading" | "ready" = "uploading",
): VehicleDocument {
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    storage_bucket: DOCUMENTS_BUCKET,
    storage_path: "",
    description: row.description,
    created_at: row.created_at,
    local_path: row.local_path,
    upload_status: uploadStatus,
  };
}

function fileNameFromPath(path: string): string {
  return path.split("/").pop()?.slice(0, 255) || "document";
}

function assertSupportedFile(contentType: string, sizeBytes: number): void {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Unsupported document type");
  }
  const maxBytes = contentType.startsWith("image/")
    ? MAX_IMAGE_BYTES
    : MAX_PDF_BYTES;
  if (sizeBytes <= 0 || sizeBytes > maxBytes) {
    throw new Error("Document exceeds the allowed file size");
  }
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported document type");
  }
}

async function getFileSize(fileUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory || typeof info.size !== "number") {
    throw new Error("Document file is unavailable");
  }
  return info.size;
}

async function getCloudDocument(documentId: string): Promise<CloudVehicleDocument | null> {
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  return (data as CloudVehicleDocument | null) ?? null;
}

async function createCloudMetadata(params: {
  row: LocalVehicleDocumentRow;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<CloudVehicleDocument> {
  const extension = extensionForContentType(params.contentType);
  const storagePath = `${params.row.vehicle_id}/vehicle-documents/${params.row.id}.${extension}`;
  const { data, error } = await supabase
    .from("vehicle_documents")
    .insert({
      id: params.row.id,
      vehicle_id: params.row.vehicle_id,
      storage_bucket: DOCUMENTS_BUCKET,
      storage_path: storagePath,
      original_name: params.originalName.slice(0, 255),
      content_type: params.contentType,
      size_bytes: params.sizeBytes,
      description: params.row.description,
      upload_status: "uploading",
      created_at: params.row.created_at,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CloudVehicleDocument;
}

async function syncLocalDocument(
  row: LocalVehicleDocumentRow,
  input?: { originalName?: string | null; contentType?: string | null },
): Promise<CloudVehicleDocument> {
  const existing = await getCloudDocument(row.id);
  if (existing?.upload_status === "ready") return existing;

  const contentType = existing?.content_type ?? inferContentType({
    uri: row.local_path,
    mimeType: input?.contentType,
    fileName: input?.originalName,
  });
  const sizeBytes = existing?.size_bytes ?? (await getFileSize(row.local_path));
  assertSupportedFile(contentType, sizeBytes);

  const metadata = existing ?? await createCloudMetadata({
    row,
    originalName: input?.originalName?.trim() || fileNameFromPath(row.local_path),
    contentType,
    sizeBytes,
  });
  const fileData = await fetchBlob(row.local_path);
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(metadata.storage_path, fileData, {
      contentType,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vehicle_documents")
    .update({ upload_status: "ready" })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CloudVehicleDocument;
}

/** Best-effort, non-destructive migration of local documents to private Storage. */
export async function syncLocalVehicleDocuments(vehicleId: string): Promise<string[]> {
  const failedIds: string[] = [];
  const rows = await listLocalVehicleDocuments(vehicleId);
  for (const row of rows) {
    try {
      await syncLocalDocument(row);
    } catch {
      failedIds.push(row.id);
    }
  }
  return failedIds;
}

export async function listVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const localRows = await listLocalVehicleDocuments(vehicleId);
  await syncLocalVehicleDocuments(vehicleId);

  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) {
    if (localRows.length > 0) return localRows.map((row) => mapLocalDocument(row));
    throw error;
  }

  const localById = new Map(localRows.map((row) => [row.id, row]));
  const cloudRows = (data ?? []) as CloudVehicleDocument[];
  const documents: VehicleDocument[] = cloudRows.map((doc) => ({
    ...doc,
    local_path: localById.get(doc.id)?.local_path,
  }));
  const cloudIds = new Set(cloudRows.map((doc) => doc.id));
  for (const row of localRows) {
    if (!cloudIds.has(row.id)) documents.push(mapLocalDocument(row));
  }
  return documents;
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
  const sizeBytes = await getFileSize(params.fileUri);
  assertSupportedFile(contentType, sizeBytes);
  const extension = extensionForContentType(contentType);
  const localPath = await saveVehicleDocumentFile({
    sourceUri: params.fileUri,
    vehicleId: params.vehicleId,
    ext: extension,
  });
  const row: LocalVehicleDocumentRow = {
    id: uuid(),
    vehicle_id: params.vehicleId,
    local_path: localPath,
    description: null,
    created_at: new Date().toISOString(),
  };
  await insertLocalVehicleDocument(row);

  try {
    const cloud = await syncLocalDocument(row, {
      originalName: params.fileName,
      contentType,
    });
    return { ...cloud, local_path: localPath };
  } catch {
    return mapLocalDocument(row);
  }
}

export async function updateVehicleDocument(
  documentId: string,
  description: string | null,
): Promise<VehicleDocument> {
  const normalizedDescription = description?.trim() || null;
  const local = await getLocalVehicleDocument(documentId);
  if (local) await updateLocalVehicleDocumentDescription(documentId, normalizedDescription);

  const cloud = await getCloudDocument(documentId);
  if (!cloud) {
    if (!local) throw new Error("Document not found");
    return { ...mapLocalDocument(local), description: normalizedDescription };
  }
  const { data, error } = await supabase
    .from("vehicle_documents")
    .update({ description: normalizedDescription })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return { ...(data as CloudVehicleDocument), local_path: local?.local_path };
}

export async function deleteVehicleDocument(document: VehicleDocument): Promise<void> {
  if (document.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);
    if (storageError) throw storageError;
    const { error } = await supabase
      .from("vehicle_documents")
      .delete()
      .eq("id", document.id);
    if (error) throw error;
  }
  if (document.local_path) await deleteLocalFile(document.local_path);
  await deleteLocalVehicleDocument(document.id);
}

export async function deleteVehicleDocumentStorage(vehicleId: string): Promise<void> {
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("storage_path")
    .eq("vehicle_id", vehicleId);
  if (error) throw error;
  const paths = (data ?? []).map((row) => row.storage_path as string);
  if (paths.length === 0) return;
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove(paths);
  if (storageError) throw storageError;
}
