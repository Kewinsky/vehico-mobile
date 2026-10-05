import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_MB,
} from "../../../shared/limits/photoLimits";

export {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_MB,
} from "../../../shared/limits/photoLimits";

/** Longest edge after resize – enough for phone UI / reports, cuts multi‑MB camera shots. */
export const UPLOAD_IMAGE_MAX_EDGE = 1600;

/** JPEG quality 0–1. 0.72 is a good size/quality tradeoff for vehicle photos. */
export const UPLOAD_IMAGE_JPEG_QUALITY = 0.72;

/** Browser/CDN cache for immutable storage paths (new path per upload). */
export const UPLOAD_IMAGE_CACHE_CONTROL = "31536000";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

export async function assertImageFileSize(
  fileUri: string,
  knownSize?: number | null,
  errorMessage = `Image must not exceed ${MAX_UPLOAD_IMAGE_MB} MB.`,
): Promise<void> {
  let size = knownSize;
  if (size == null) {
    const info = await FileSystem.getInfoAsync(fileUri);
    size = info.exists && "size" in info ? info.size : undefined;
  }
  if (typeof size === "number" && size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error(errorMessage);
  }
}

/**
 * Resize (if needed) and convert to JPEG before Storage upload.
 * Returns a local file URI ready for `fetchBlob`.
 */
export async function compressImageForUpload(fileUri: string): Promise<string> {
  await assertImageFileSize(fileUri);
  const actions: ImageManipulator.Action[] = [];

  try {
    const { width, height } = await getImageSize(fileUri);
    const longest = Math.max(width, height);
    if (longest > UPLOAD_IMAGE_MAX_EDGE) {
      if (width >= height) {
        actions.push({ resize: { width: UPLOAD_IMAGE_MAX_EDGE } });
      } else {
        actions.push({ resize: { height: UPLOAD_IMAGE_MAX_EDGE } });
      }
    }
  } catch {
    // If size is unknown, still re-encode as JPEG below.
  }

  const manipulated = await ImageManipulator.manipulateAsync(fileUri, actions, {
    compress: UPLOAD_IMAGE_JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  await assertImageFileSize(manipulated.uri);

  return manipulated.uri;
}
