import { ENV } from "../../config/env";
import { supabase } from "../supabase/client";

export type VehicleChatLanguage = "pl" | "en";

export type VehicleChatAnswer = {
  answer: string;
};

export type VehicleChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type VehicleChatErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED";

export class VehicleChatError extends Error {
  constructor(
    public readonly code: VehicleChatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VehicleChatError";
  }
}

type VehicleChatRequest = {
  vehicleId: string;
  message: string;
  language: VehicleChatLanguage;
  history?: VehicleChatHistoryMessage[];
  signal: AbortSignal;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type VehicleChatFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<FetchResponse>;

type VehicleChatDependencies = {
  baseUrl: string;
  anonKey: string;
  fetch: VehicleChatFetch;
  getAccessToken: () => Promise<string | null>;
};

type ErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

function parseAnswer(value: unknown): VehicleChatAnswer | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("answer" in value)
  ) {
    return null;
  }

  const { answer } = value;
  if (typeof answer !== "string" || answer.length === 0) {
    return null;
  }

  return { answer };
}

function parseErrorPayload(value: unknown): ErrorPayload | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("error" in value) ||
    typeof value.error !== "object" ||
    value.error === null ||
    !("code" in value.error) ||
    !("message" in value.error) ||
    typeof value.error.code !== "string" ||
    typeof value.error.message !== "string"
  ) {
    return null;
  }

  return { error: { code: value.error.code, message: value.error.message } };
}

async function responseError(response: FetchResponse): Promise<VehicleChatError> {
  try {
    const payload = parseErrorPayload(await response.json());
    if (payload) {
      return new VehicleChatError("REQUEST_FAILED", payload.error.message);
    }
  } catch {
    // The user receives a stable message when the server error body is unreadable.
  }

  return new VehicleChatError(
    "REQUEST_FAILED",
    `Vehicle assistant request failed with status ${response.status}.`,
  );
}

export function createVehicleChatRequester({
  baseUrl,
  anonKey,
  fetch,
  getAccessToken,
}: VehicleChatDependencies) {
  return async function requestVehicleChat({
    vehicleId,
    message,
    language,
    history = [],
    signal,
  }: VehicleChatRequest): Promise<VehicleChatAnswer> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new VehicleChatError(
        "AUTH_REQUIRED",
        "An authenticated session is required.",
      );
    }

    let response: FetchResponse;
    try {
      response = await fetch(`${baseUrl}/functions/v1/vehicle-chat`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          message,
          language,
          history,
        }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new VehicleChatError(
        "NETWORK_ERROR",
        "Could not connect to the vehicle assistant.",
      );
    }

    if (!response.ok) throw await responseError(response);

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new VehicleChatError(
        "INVALID_RESPONSE",
        "The vehicle assistant returned an invalid response.",
      );
    }

    const answer = parseAnswer(responseBody);
    if (!answer) {
      throw new VehicleChatError(
        "INVALID_RESPONSE",
        "The vehicle assistant returned an invalid response.",
      );
    }

    return answer;
  };
}

export const requestVehicleChat = createVehicleChatRequester({
  baseUrl: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  fetch: (input, init) => globalThis.fetch(input, init),
  getAccessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },
});
