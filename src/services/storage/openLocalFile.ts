import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { toFileUri } from "../localStorage/localFiles";

/** Thrown when the SQLite row exists but the file on disk is missing. */
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

/**
 * Open a locally stored attachment/document.
 * Verifies the file exists before attempting to open (stale DB paths fail fast).
 */
export async function openLocalFile(localPath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(localPath);
  if (!info.exists) {
    throw new LocalFileNotFoundError();
  }

  const uri = toFileUri(localPath);

  // iOS: Linking.openURL(file://…) is unreliable for HEIC/PDF in sandbox; share sheet works.
  if (Platform.OS === "ios") {
    await shareLocalFile(uri);
    return;
  }

  try {
    await Linking.openURL(uri);
  } catch {
    await shareLocalFile(uri);
  }
}
