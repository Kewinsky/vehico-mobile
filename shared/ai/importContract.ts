export const AI_IMPORT_FIELD_STATUSES = [
  "recognized",
  "uncertain",
  "missing",
  "rejected",
] as const;

export type AiImportFieldStatus = (typeof AI_IMPORT_FIELD_STATUSES)[number];

export function isAiImportFieldStatus(
  value: unknown,
): value is AiImportFieldStatus {
  return AI_IMPORT_FIELD_STATUSES.includes(value as AiImportFieldStatus);
}

export function isAiImportFieldValuePresenceValid(
  status: AiImportFieldStatus,
  value: unknown,
): boolean {
  const requiresEmptyValue = status === "missing" || status === "rejected";
  return requiresEmptyValue ? value === null : value !== null;
}
