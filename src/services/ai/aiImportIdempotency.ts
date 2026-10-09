export function createAiImportRequestId(): string {
  const secureUuid = globalThis.crypto?.randomUUID?.();
  if (secureUuid) return `ai_${secureUuid}`;
  const randomPart = [Math.random(), Math.random()]
    .map((value) => value.toString(36).slice(2, 14))
    .join("");
  return `ai_${Date.now().toString(36)}_${randomPart}`;
}

export function aiImportEntryRequestId(
  importRequestId: string,
  entryIndex: number,
): string {
  if (!Number.isInteger(entryIndex) || entryIndex < 0) {
    throw new Error("AI import entry index must be a non-negative integer.");
  }
  return `${importRequestId}:${entryIndex}`;
}
