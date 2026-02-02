import type { VehicleDocument } from "../../types/domain";
import {
  inferContentType,
  inferExtension,
  uuid,
} from "../storage/uploadUtils";
import {
  deleteLocalVehicleDocument,
  getLocalVehicleDocument,
  insertLocalVehicleDocument,
  listLocalVehicleDocuments,
  updateLocalVehicleDocumentDescription,
} from "../localStorage/localDb";
import {
  deleteLocalFile,
  saveVehicleDocumentFile,
} from "../localStorage/localFiles";

/** List vehicle documents (local only). */
export async function listVehicleDocuments(
  vehicleId: string
): Promise<VehicleDocument[]> {
  const localRows = await listLocalVehicleDocuments(vehicleId);
  return localRows.map((row) => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    storage_bucket: "documents",
    storage_path: "",
    description: row.description,
    created_at: row.created_at,
    local_path: row.local_path,
  }));
}

/** Upload vehicle document to local storage. */
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
  const ext = inferExtension({
    uri: params.fileUri,
    contentType,
    fileName: params.fileName,
  });

  const localPath = await saveVehicleDocumentFile({
    sourceUri: params.fileUri,
    vehicleId: params.vehicleId,
    ext,
  });

  const id = uuid();
  const created_at = new Date().toISOString();
  await insertLocalVehicleDocument({
    id,
    vehicle_id: params.vehicleId,
    local_path: localPath,
    description: null,
    created_at,
  });

  return {
    id,
    vehicle_id: params.vehicleId,
    storage_bucket: "documents",
    storage_path: "",
    description: null,
    created_at,
    local_path: localPath,
  };
}

export async function updateVehicleDocument(
  docId: string,
  description: string | null
): Promise<VehicleDocument> {
  const local = await getLocalVehicleDocument(docId);
  if (!local) throw new Error("Document not found");
  await updateLocalVehicleDocumentDescription(docId, description);
  return {
    id: local.id,
    vehicle_id: local.vehicle_id,
    storage_bucket: "documents",
    storage_path: "",
    description,
    created_at: local.created_at,
    local_path: local.local_path,
  };
}

export async function deleteVehicleDocument(
  doc: VehicleDocument
): Promise<void> {
  if (doc.local_path) {
    await deleteLocalFile(doc.local_path);
  }
  await deleteLocalVehicleDocument(doc.id);
}
