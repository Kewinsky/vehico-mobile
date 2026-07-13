import { Alert } from "react-native";

const MAX_USER_MESSAGE_LENGTH = 120;

const TECHNICAL_MESSAGE_PATTERN =
  /supabase|postgrest|pgrst|jwt|graphql|postgres|row level security|\brls\b|edge function|refresh token|invalid refresh|network request failed|fetch failed|json parse|typeerror|referenceerror|syntaxerror|unhandled|exception|errno|status code|\b(401|403|404|422|500|502|503)\b|https?:\/\/|@react-native|hermes|metro/i;

export function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function looksTechnical(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > MAX_USER_MESSAGE_LENGTH) return true;
  if (TECHNICAL_MESSAGE_PATTERN.test(trimmed)) return true;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
  if (trimmed.includes("\n") && trimmed.length > 60) return true;
  return false;
}

/** Maps thrown errors to a short, user-safe message. */
export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = extractErrorMessage(error).trim();
  if (!message || looksTechnical(message)) {
    return fallback;
  }
  return message;
}

export function alertCaughtError(
  title: string,
  error: unknown,
  fallback: string,
) {
  Alert.alert(title, getUserFacingErrorMessage(error, fallback));
}
