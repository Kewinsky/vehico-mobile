export function randomId(): string {
  // Non-cryptographic id is sufficient for collision avoidance in filenames.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function fetchBlob(fileUri: string): Promise<Blob> {
  const res = await fetch(fileUri);
  if (!res.ok) {
    throw new Error(`Failed to read file for upload (HTTP ${res.status})`);
  }
  return await res.blob();
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

