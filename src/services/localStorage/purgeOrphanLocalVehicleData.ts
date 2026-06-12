import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../supabase/client";
import {
  deleteLocalAttachment,
  deleteLocalVehicleDocument,
  listAllLocalAttachmentRows,
  listAllLocalVehicleDocumentRows,
} from "./localDb";
import {
  deleteLocalFile,
  parseVehicleIdFromLocalAttachmentPath,
} from "./localFiles";

const CHUNK = 80;

/** All service entry IDs still on the server for the given vehicles (paginated). */
async function fetchServiceEntryIdsForVehicles(
  vehicleIds: string[],
): Promise<Set<string>> {
  const ids = new Set<string>();
  if (vehicleIds.length === 0) return ids;

  for (let i = 0; i < vehicleIds.length; i += CHUNK) {
    const chunk = vehicleIds.slice(i, i + CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("service_entries")
        .select("id")
        .in("vehicle_id", chunk)
        .range(from, from + 999);
      if (error) throw error;
      const rows = data ?? [];
      for (const r of rows) ids.add(r.id as string);
      if (rows.length < 1000) break;
      from += 1000;
    }
  }
  return ids;
}

function hasAttachmentsForValidVehicles(
  attachmentRows: { local_path: string }[],
  validVehicles: Set<string>,
): boolean {
  return attachmentRows.some((row) => {
    const vehicleId = parseVehicleIdFromLocalAttachmentPath(row.local_path);
    return vehicleId != null && validVehicles.has(vehicleId);
  });
}

/**
 * Remove SQLite rows + files for vehicles / service entries that no longer exist on Supabase
 * (e.g. retention job deleted hidden vehicles).
 *
 * Also deletes orphan directories under `local_attachments/<vehicleId>/` and
 * `local_vehicle_documents/<vehicleId>/` when the vehicle is gone from the server.
 */
export async function purgeOrphanLocalVehicleData(
  validVehicleIds: string[],
): Promise<void> {
  const validVehicles = new Set(validVehicleIds);

  const validServiceEntries =
    validVehicleIds.length === 0
      ? new Set<string>()
      : await fetchServiceEntryIdsForVehicles(validVehicleIds);

  const attachmentRows = await listAllLocalAttachmentRows();

  // Avoid mass-deleting attachments when the server returned zero service entries
  // but we still have files for valid vehicles (incomplete fetch / transient API issue).
  const skipServiceEntryPurge =
    validVehicleIds.length > 0 &&
    validServiceEntries.size === 0 &&
    hasAttachmentsForValidVehicles(attachmentRows, validVehicles);

  for (const row of attachmentRows) {
    if (validVehicleIds.length === 0) {
      await deleteLocalFile(row.local_path);
      await deleteLocalAttachment(row.id);
      continue;
    }

    const vehicleId = parseVehicleIdFromLocalAttachmentPath(row.local_path);
    if (vehicleId != null && !validVehicles.has(vehicleId)) {
      await deleteLocalFile(row.local_path);
      await deleteLocalAttachment(row.id);
      continue;
    }

    if (skipServiceEntryPurge) continue;

    const keep = validServiceEntries.has(row.service_entry_id);
    if (!keep) {
      await deleteLocalFile(row.local_path);
      await deleteLocalAttachment(row.id);
    }
  }

  const docRows = await listAllLocalVehicleDocumentRows();
  for (const row of docRows) {
    const keep = validVehicles.has(row.vehicle_id);
    if (!keep) {
      await deleteLocalFile(row.local_path);
      await deleteLocalVehicleDocument(row.id);
    }
  }

  const base = FileSystem.documentDirectory ?? "";
  if (!base) return;

  for (const rootName of ["local_attachments", "local_vehicle_documents"]) {
    const root = `${base}${rootName}`;
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists || !info.isDirectory) continue;
    const names = await FileSystem.readDirectoryAsync(root);
    for (const name of names) {
      if (!validVehicles.has(name)) {
        await FileSystem.deleteAsync(`${root}/${name}`, { idempotent: true });
      }
    }
  }
}
