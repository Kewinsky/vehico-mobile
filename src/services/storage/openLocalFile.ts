import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { toFileUri } from "../localStorage/localFiles";

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
