import * as FileSystem from "expo-file-system/legacy";

export function randomId(): string {
  // Non-cryptographic id is sufficient for collision avoidance in filenames.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/** Generate a UUID v4-like id for local entities. */
export function uuid(): string {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-8${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

export async function fetchBlob(fileUri: string): Promise<Blob | ArrayBuffer> {
  // In React Native, we need to use expo-file-system to read files
  // because standard fetch() doesn't work with file:// URIs from ImagePicker
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to ArrayBuffer (React Native doesn't support Blob from ArrayBuffer)
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Return ArrayBuffer instead of Blob for React Native compatibility
    // Supabase Storage accepts ArrayBuffer in React Native
    return bytes.buffer;
  } catch (error) {
    // Fallback to fetch for remote URIs (http/https)
    if (fileUri.startsWith("http://") || fileUri.startsWith("https://")) {
      const res = await fetch(fileUri);
      if (!res.ok) {
        throw new Error(`Failed to read file for upload (HTTP ${res.status})`);
      }
      // For remote URIs, we can use blob() which works in web environments
      return await res.blob();
    }
    throw new Error(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function inferContentType(params: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): string {
  if (params.mimeType) return params.mimeType;
  const lower = (params.fileName ?? params.uri).toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export function inferExtension(params: {
  uri: string;
  contentType: string;
  fileName?: string | null;
}): string {
  const lower = (params.fileName ?? params.uri).toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot >= 0 && dot < lower.length - 1) return lower.slice(dot + 1);
  if (params.contentType === "image/png") return "png";
  if (params.contentType === "image/webp") return "webp";
  if (params.contentType === "image/jpeg") return "jpg";
  if (params.contentType === "application/pdf") return "pdf";
  return "bin";
}

