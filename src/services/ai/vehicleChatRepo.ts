import { fetch as expoFetch } from "expo/fetch";

import { ENV } from "../../config/env";
import { supabase } from "../supabase/client";

export type VehicleChatLanguage = "pl" | "en";
export type VehicleChatUrgency =
  | "monitor"
  | "service_soon"
  | "stop_driving"
  | "unknown";

export type VehicleChatAnswer = {
  answer: string;
  urgency: VehicleChatUrgency;
  uncertainty: string;
  nextStep: string;
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

type StreamRequest = {
  message: string;
  language: VehicleChatLanguage;
  history?: VehicleChatHistoryMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
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

type StreamEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "complete"; data: VehicleChatAnswer }
  | { event: "error"; data: { code: string; message: string } };

function isUrgency(value: unknown): value is VehicleChatUrgency {
  return (
    value === "monitor" ||
    value === "service_soon" ||
    value === "stop_driving" ||
    value === "unknown"
  );
}

function parseAnswer(value: unknown): VehicleChatAnswer | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("answer" in value) ||
    !("urgency" in value) ||
    !("uncertainty" in value) ||
    !("nextStep" in value)
  ) {
    return null;
  }

  const { answer, urgency, uncertainty, nextStep } = value;
  if (
    typeof answer !== "string" ||
    !isUrgency(urgency) ||
    typeof uncertainty !== "string" ||
    typeof nextStep !== "string" ||
    answer.length === 0 ||
    uncertainty.length === 0 ||
    nextStep.length === 0
  ) {
    return null;
  }

  return { answer, urgency, uncertainty, nextStep };
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

function parseEvent(frame: string): StreamEvent | null {
  const lines = frame.split("\n");
  const eventName = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!eventName || !data) return null;

  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }

  if (eventName === "delta") {
    if (
      typeof value === "object" &&
      value !== null &&
      "text" in value &&
      typeof value.text === "string"
    ) {
      return { event: "delta", data: { text: value.text } };
    }
    return null;
  }

  if (eventName === "complete") {
    const answer = parseAnswer(value);
    return answer ? { event: "complete", data: answer } : null;
  }

  if (eventName === "error") {
    if (
      typeof value === "object" &&
      value !== null &&
      "code" in value &&
      "message" in value &&
      typeof value.code === "string" &&
      typeof value.message === "string"
    ) {
      return {
        event: "error",
        data: { code: value.code, message: value.message },
      };
    }
  }

  return null;
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

export function createVehicleChatStreamer({
  baseUrl,
  anonKey,
  fetch,
  getAccessToken,
}: VehicleChatDependencies) {
  return async function streamVehicleChat({
    message,
    language,
    history = [],
    signal,
    onDelta,
  }: StreamRequest): Promise<VehicleChatAnswer> {
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
          Accept: "text/event-stream",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, language, history, stream: true }),
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
    if (!response.body) {
      throw new VehicleChatError(
        "INVALID_RESPONSE",
        "The vehicle assistant returned an empty response.",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completedAnswer: VehicleChatAnswer | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let separatorIndex = buffer.indexOf("\n\n");

      while (separatorIndex >= 0) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf("\n\n");

        const event = parseEvent(frame);
        if (!event) {
          throw new VehicleChatError(
            "INVALID_RESPONSE",
            "The vehicle assistant returned an invalid stream event.",
          );
        }

        if (event.event === "delta") onDelta(event.data.text);
        if (event.event === "complete") completedAnswer = event.data;
        if (event.event === "error") {
          throw new VehicleChatError("REQUEST_FAILED", event.data.message);
        }
      }
    }

    if (!completedAnswer) {
      throw new VehicleChatError(
        "INVALID_RESPONSE",
        "The vehicle assistant returned an incomplete response.",
      );
    }

    return completedAnswer;
  };
}

export const streamVehicleChat = createVehicleChatStreamer({
  baseUrl: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  fetch: (input, init) => expoFetch(input, init),
  getAccessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },
});
