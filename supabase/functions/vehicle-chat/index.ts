import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const MAX_MESSAGE_LENGTH = 2000;

type SupportedLanguage = "pl" | "en";

interface VehicleChatRequest {
  message: string;
  language: SupportedLanguage;
}

type ErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_JSON"
  | "INVALID_REQUEST";

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function parseRequest(value: unknown): VehicleChatRequest | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("message" in value) ||
    !("language" in value)
  ) {
    return null;
  }

  const { message, language } = value;

  if (
    typeof message !== "string" ||
    (language !== "pl" && language !== "en")
  ) {
    return null;
  }

  const normalizedMessage = message.trim();

  if (
    normalizedMessage.length === 0 ||
    normalizedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return null;
  }

  return {
    message: normalizedMessage,
    language,
  };
}

export default {
  fetch: withSupabase(
    { auth: ["publishable", "secret"] },
    async (req): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse(
          405,
          "METHOD_NOT_ALLOWED",
          "Only POST requests are supported.",
        );
      }

      let value: unknown;

      try {
        value = await req.json();
      } catch {
        return errorResponse(
          400,
          "INVALID_JSON",
          "Request body is not valid JSON.",
        );
      }

      const request = parseRequest(value);

      if (!request) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "Message must contain 1–2000 characters and language must be pl or en.",
        );
      }

      return Response.json({
        received: request,
      });
    },
  ),
};
