import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { toFileUri } from "../localStorage/localFiles";
import { supabase } from "../supabase/client";
import type { VehicleDocument } from "../../types/domain";

export class LocalFileNotFoundError extends Error {
  constructor() {
    super("LOCAL_FILE_NOT_FOUND");
    this.name = "LocalFileNotFoundError";
  }
}

async function shareLocalFile(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(uri);
}

export async function openLocalFile(localPath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(localPath);
  if (!info.exists) {
    throw new LocalFileNotFoundError();
  }

  const uri = toFileUri(localPath);
  await shareLocalFile(uri);
}

export async function openVehicleDocumentFile(
  document: VehicleDocument,
): Promise<void> {
  if (document.local_path) {
    const info = await FileSystem.getInfoAsync(document.local_path);
    if (info.exists) {
      await shareLocalFile(toFileUri(document.local_path));
      return;
    }
  }
  if (!document.storage_path) throw new LocalFileNotFoundError();

  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, 60);
  if (error) throw error;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error("Cache directory is unavailable");
  const extension = document.storage_path.split(".").pop() || "bin";
  const destination = `${cacheDirectory}${document.id}.${extension}`;
  const result = await FileSystem.downloadAsync(data.signedUrl, destination);
  await shareLocalFile(result.uri);
}
