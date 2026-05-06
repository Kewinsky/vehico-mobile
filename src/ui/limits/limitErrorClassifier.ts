function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) {
    const message = (err as any).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

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
