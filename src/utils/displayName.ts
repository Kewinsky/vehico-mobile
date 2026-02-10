/**
 * Normalize display name: trim and capitalize first letter.
 * Use whenever displaying or persisting user display name (e.g. from settings).
 */
export function normalizeDisplayName(
  value: string | null | undefined,
): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}
