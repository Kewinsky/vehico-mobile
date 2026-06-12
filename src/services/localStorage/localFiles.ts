import * as FileSystem from "expo-file-system/legacy";
import { randomId } from "../storage/uploadUtils";

const DOCUMENTS_DIR = "local_attachments";
const VEHICLE_DOCS_DIR = "local_vehicle_documents";

const LOCAL_ATTACHMENT_VEHICLE_RE = /local_attachments\/([^/]+)\//;

export function parseVehicleIdFromLocalAttachmentPath(
  localPath: string,
): string | null {
  const match = localPath.match(LOCAL_ATTACHMENT_VEHICLE_RE);
  return match?.[1] ?? null;
}

function getBaseDir(): string {
  return FileSystem.documentDirectory ?? "";
}

export async function saveLocalFile(params: {
  sourceUri: string;
  vehicleId: string;
  subDir: string;
  ext: string;
}): Promise<string> {
  const baseDir = getBaseDir();
  const dir = `${baseDir}${DOCUMENTS_DIR}/${params.vehicleId}/${params.subDir}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const fileName = `${Date.now()}-${randomId()}.${params.ext}`;
  const destPath = `${dir}/${fileName}`;
  await FileSystem.copyAsync({ from: params.sourceUri, to: destPath });
  return destPath;
}

export async function saveAttachmentFile(params: {
  sourceUri: string;
  vehicleId: string;
  serviceEntryId: string;
  ext: string;
}): Promise<string> {
  return saveLocalFile({
    sourceUri: params.sourceUri,
    vehicleId: params.vehicleId,
    subDir: params.serviceEntryId,
    ext: params.ext,
  });
}

export async function saveVehicleDocumentFile(params: {
  sourceUri: string;
  vehicleId: string;
  ext: string;
}): Promise<string> {
  const baseDir = getBaseDir();
  const dir = `${baseDir}${VEHICLE_DOCS_DIR}/${params.vehicleId}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const fileName = `${Date.now()}-${randomId()}.${params.ext}`;
  const destPath = `${dir}/${fileName}`;
  await FileSystem.copyAsync({ from: params.sourceUri, to: destPath });
  return destPath;
}

export async function deleteLocalFile(localPath: string): Promise<void> {
  const exists = await FileSystem.getInfoAsync(localPath);
  if (exists.exists) {
    await FileSystem.deleteAsync(localPath);
  }
}

export function toFileUri(localPath: string): string {
  if (localPath.startsWith("file://")) return localPath;
  return `file://${localPath}`;
}
