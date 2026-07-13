import { extractErrorMessage } from "../errors/userFacingError";

export { extractErrorMessage };

export function isLimitError(err: unknown): boolean {
  const message = extractErrorMessage(err).toLowerCase();
  if (!message) return false;
  return (
    message.includes("limit reached") ||
    message.includes("upgrade to premium") ||
    message.includes("premium required")
  );
}

export function getLimitErrorMessage(err: unknown): string {
  return extractErrorMessage(err);
}
