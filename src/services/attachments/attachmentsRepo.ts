import type { Attachment, AttachmentType } from "../../types/domain";
import {
  inferContentType,
  inferExtension,
  uuid,
} from "../storage/uploadUtils";
import {
  deleteLocalAttachment,
  insertLocalAttachment,
  listLocalAttachments,
  listAllLocalAttachmentsByVehicle,
} from "../localStorage/localDb";
import {
  deleteLocalFile,
  saveAttachmentFile,
} from "../localStorage/localFiles";
import { listServiceEntries } from "../serviceEntries/serviceEntriesRepo";

export type VehicleAttachment = Attachment & {
  serviceEntryTitle: string | null;
};

/** List attachments for a service entry (local only). */
export async function listAttachments(
  serviceEntryId: string
): Promise<Attachment[]> {
  const localRows = await listLocalAttachments(serviceEntryId);
  return localRows.map((row) => ({
    id: row.id,
    service_entry_id: row.service_entry_id,
    type: row.type,
    storage_bucket: "documents",
    storage_path: "",
    created_at: row.created_at,
    local_path: row.local_path,
  }));
}

/** Upload attachment to local storage. */
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
  const attachmentType: AttachmentType =
    contentType.startsWith("image/") ? "photo" : "receipt";
  const ext = inferExtension({
    uri: params.fileUri,
    contentType,
    fileName: params.fileName,
  });

  const localPath = await saveAttachmentFile({
    sourceUri: params.fileUri,
    vehicleId: params.vehicleId,
    serviceEntryId: params.serviceEntryId,
    ext,
  });

  const id = uuid();
  const created_at = new Date().toISOString();
  await insertLocalAttachment({
    id,
    service_entry_id: params.serviceEntryId,
    type: attachmentType,
    local_path: localPath,
    created_at,
  });

  return {
    id,
    service_entry_id: params.serviceEntryId,
    type: attachmentType,
    storage_bucket: "documents",
    storage_path: "",
    created_at,
    local_path: localPath,
  };
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  if (att.local_path) {
    await deleteLocalFile(att.local_path);
  }
  await deleteLocalAttachment(att.id);
}

/** List all attachments for a vehicle (local only). */
export async function listVehicleAttachments(
  vehicleId: string
): Promise<VehicleAttachment[]> {
  const entries = await listServiceEntries(vehicleId);
  const entryIds = entries.map((e) => e.id);
  const localRows = await listAllLocalAttachmentsByVehicle(entryIds);
  const titleMap = new Map(entries.map((e) => [e.id, e.title]));

  return localRows.map((row) => ({
    id: row.id,
    service_entry_id: row.service_entry_id,
    type: row.type,
    storage_bucket: "documents" as const,
    storage_path: "",
    created_at: row.created_at,
    local_path: row.local_path,
    serviceEntryTitle: titleMap.get(row.service_entry_id) ?? null,
  }));
}
