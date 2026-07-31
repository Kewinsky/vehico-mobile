import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

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

/**
 * Resize (if needed) and convert to JPEG before Storage upload.
 * Returns a local file URI ready for `fetchBlob`.
 */
export async function compressImageForUpload(fileUri: string): Promise<string> {
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

  return manipulated.uri;
}
