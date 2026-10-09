export const MAX_SERVICE_PDF_PAGES = 10;

const ACTIVE_PDF_TOKENS = [
  "/JavaScript",
  "/JS",
  "/Launch",
  "/OpenAction",
  "/EmbeddedFile",
  "/RichMedia",
  "/XFA",
] as const;

function decodeBase64Prefix(base64: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    let result = "";
    const chunkSize = 16_384;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      result += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return result;
  } catch {
    return null;
  }
}

export type PdfSecurityResult =
  | { safe: true; pageCount: number }
  | { safe: false; reason: "malformed" | "active_content" | "too_many_pages" };

export function inspectPdfSecurity(base64: string): PdfSecurityResult {
  const contents = decodeBase64Prefix(base64);
  if (
    contents === null ||
    !contents.startsWith("%PDF-") ||
    !contents.slice(-2048).includes("%%EOF")
  ) {
    return { safe: false, reason: "malformed" };
  }

  if (ACTIVE_PDF_TOKENS.some((token) => contents.includes(token))) {
    return { safe: false, reason: "active_content" };
  }

  const pageObjects = contents.match(/\/Type\s*\/Page(?!s)\b/g)?.length ?? 0;
  const declaredCounts = [...contents.matchAll(/\/Count\s+(\d+)\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isSafeInteger(value) && value > 0);
  const pageCount = Math.max(pageObjects, ...declaredCounts, 0);
  if (pageCount === 0) return { safe: false, reason: "malformed" };
  if (pageCount > MAX_SERVICE_PDF_PAGES) {
    return { safe: false, reason: "too_many_pages" };
  }
  return { safe: true, pageCount };
}
