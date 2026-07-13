import { Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { ExportFormat } from "../services/portability/exportData";

type ShareUrlOptions = {
  title?: string;
  message?: string;
};

export async function shareUrl(
  url: string,
  { title, message }: ShareUrlOptions = {},
): Promise<void> {
  const payload = { url, message: message ?? title };

  await Share.share(payload);
}

export async function shareExportFile(
  content: string,
  format: ExportFormat,
  dialogTitle: string,
): Promise<void> {
  const extension = format === "csv" ? "csv" : "json";
  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory is not available");
  }

  const fileUri = `${cacheDir}vericar-export-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    await shareUrl(fileUri, { title: dialogTitle, message: content });
    return;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle,
    UTI: format === "csv" ? "public.comma-separated-values-text" : "public.json",
  });
}
