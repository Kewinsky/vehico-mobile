import { toFileUri } from "../localStorage/localFiles";

/** Get URL to open an attachment (local only). */
export function getAttachmentOpenUrl(att: { local_path?: string }): string {
  if (!att.local_path) throw new Error("Attachment has no local file");
  return toFileUri(att.local_path);
}

/** Get URL to open a vehicle document (local only). */
export function getVehicleDocumentOpenUrl(doc: {
  local_path?: string;
}): string {
  if (!doc.local_path) throw new Error("Document has no local file");
  return toFileUri(doc.local_path);
}

/** Get filename for display (from local_path). */
export function getFileNameFromItem(item: {
  local_path?: string;
  storage_path?: string;
}): string {
  const path = item.local_path ?? item.storage_path ?? "";
  return path.split("/").slice(-1)[0] ?? "file";
}
