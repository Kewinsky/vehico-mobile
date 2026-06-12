import {
  deleteLocalAttachment,
  listLocalAttachments,
} from "../localStorage/localDb";
import { deleteLocalFile } from "../localStorage/localFiles";

export async function deleteAttachmentsForServiceEntry(
  serviceEntryId: string,
): Promise<void> {
  const rows = await listLocalAttachments(serviceEntryId);
  for (const row of rows) {
    await deleteLocalFile(row.local_path);
    await deleteLocalAttachment(row.id);
  }
}
