const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_LENGTH = 8000;
const MAX_OUTPUT_TOKENS = 500;
const MODEL_TIMEOUT_MS = 15_000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-luna";

const SYSTEM_PROMPT_V2 = `You are the Vericar vehicle assistant.

Help users with general vehicle ownership, maintenance, symptoms, operating costs, and safe next steps.

Rules:
- Use only information contained in the current conversation.
- You do not have access to the user's vehicle, service history, documents, measurements, or current internet sources.
- Never claim that you have confirmed a diagnosis.
- Clearly communicate missing information and uncertainty.
- If the described situation may make continued driving unsafe, prioritize stopping safely and professional assistance.
- Do not provide instructions for dangerous repairs or bypassing vehicle safety systems.
- Do not invent service history, vehicle specifications, measurements, prices, or sources.
- Answer in the language specified by the user.
- Keep the answer concise and practical.
- The answer must stand on its own and explicitly communicate urgency and any safety-critical action. Do not rely on the structured metadata alone.

Urgency meanings:
- monitor: no immediate intervention appears necessary based on the provided information.
- service_soon: inspection or service should be arranged soon.
- stop_driving: continuing to drive may be unsafe or may cause serious damage.
- unknown: there is not enough information to assess urgency.

The answer should contain 2–5 short sentences.
The uncertainty should explicitly state what cannot be confirmed.
The next step should be one clear, actionable recommendation.`;

const VEHICLE_CHAT_ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    urgency: {
      type: "string",
      enum: ["monitor", "service_soon", "stop_driving", "unknown"],
    },
    uncertainty: { type: "string" },
    nextStep: { type: "string" },
  },
  required: ["answer", "urgency", "uncertainty", "nextStep"],
  additionalProperties: false,
};

type SupportedLanguage = "pl" | "en";
type Urgency = "monitor" | "service_soon" | "stop_driving" | "unknown";

interface VehicleChatRequest {
  message: string;
  language: SupportedLanguage;
  history: VehicleChatHistoryMessage[];
}

interface VehicleChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface VehicleChatAnswer {
  answer: string;
  urgency: Urgency;
  uncertainty: string;
  nextStep: string;
}

type ErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "PREMIUM_REQUIRED"
  | "AUTHORIZATION_FAILED"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "SERVER_MISCONFIGURATION"
  | "MODEL_TIMEOUT"
  | "MODEL_REQUEST_FAILED"
  | "INVALID_MODEL_RESPONSE";

type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

interface VehicleChatHandlerDependencies {
  getOpenAiApiKey: () => string | undefined;
  hasPremiumAccess: (req: Request) => Promise<boolean>;
  fetch: ModelFetch;
}

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
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
  const history = "history" in value ? value.history : [];

  if (
    typeof message !== "string" ||
    (language !== "pl" && language !== "en") ||
    !Array.isArray(history) ||
    history.length > MAX_HISTORY_MESSAGES
  ) {
    return null;
  }

  const normalizedMessage = message.trim();

  if (
    normalizedMessage.length === 0 ||
    normalizedMessage.length > MAX_MESSAGE_LENGTH ||
    !history.every(
      (item): item is VehicleChatHistoryMessage =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        (item.role === "user" || item.role === "assistant") &&
        "content" in item &&
        typeof item.content === "string" &&
        item.content.trim().length > 0 &&
        item.content.length <= MAX_MESSAGE_LENGTH,
    ) ||
    history.reduce((length, item) => length + item.content.length, 0) >
      MAX_HISTORY_LENGTH
  ) {
    return null;
  }

  return {
    message: normalizedMessage,
    language,
    history: history.map((item) => ({
      role: item.role,
      content: item.content.trim(),
    })),
  };
}

function isUrgency(value: unknown): value is Urgency {
  return (
    value === "monitor" ||
    value === "service_soon" ||
    value === "stop_driving" ||
    value === "unknown"
  );
}

function parseVehicleChatAnswer(value: unknown): VehicleChatAnswer | null {
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
    answer.trim().length === 0 ||
    uncertainty.trim().length === 0 ||
    nextStep.trim().length === 0
  ) {
    return null;
  }

  return {
    answer: answer.trim(),
    urgency,
    uncertainty: uncertainty.trim(),
    nextStep: nextStep.trim(),
  };
}

function extractOutputText(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("status" in value) ||
    value.status !== "completed" ||
    !("output" in value) ||
    !Array.isArray(value.output)
  ) {
    return null;
  }

  for (const item of value.output) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("content" in item) ||
      !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "type" in content &&
        content.type === "output_text" &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}

function parseStructuredAnswer(outputText: string): VehicleChatAnswer | null {
  try {
    return parseVehicleChatAnswer(JSON.parse(outputText));
  } catch {
    return null;
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function modelRequestBody(request: VehicleChatRequest): string {
  return JSON.stringify({
    model: MODEL,
    instructions: SYSTEM_PROMPT_V2,
    input: [
      ...request.history,
      {
        role: "user",
        content: `Language: ${request.language}\n\n${request.message}`,
      },
    ],
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "vehicle_chat_answer",
        strict: true,
        schema: VEHICLE_CHAT_ANSWER_SCHEMA,
      },
    },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
  });
}

export function createVehicleChatHandler({
  getOpenAiApiKey,
  hasPremiumAccess,
  fetch: fetchModel,
}: VehicleChatHandlerDependencies): (req: Request) => Promise<Response> {
  return async (req): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Only POST requests are supported.",
      );
    }

    let premiumAccess: boolean;

    try {
      premiumAccess = await hasPremiumAccess(req);
    } catch {
      return errorResponse(
        503,
        "AUTHORIZATION_FAILED",
        "Premium access could not be verified.",
      );
    }

    if (!premiumAccess) {
      return errorResponse(
        403,
        "PREMIUM_REQUIRED",
        "An active Premium plan is required to use the vehicle assistant.",
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
        "Message, language, or bounded conversation history is invalid.",
      );
    }

    const openAiApiKey = getOpenAiApiKey();

    if (!openAiApiKey) {
      return errorResponse(
        500,
        "SERVER_MISCONFIGURATION",
        "The vehicle assistant is not configured.",
      );
    }

    let modelResponse: Response;

    try {
      modelResponse = await fetchModel(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: modelRequestBody(request),
        signal: AbortSignal.any([
          req.signal,
          AbortSignal.timeout(MODEL_TIMEOUT_MS),
        ]),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        return errorResponse(
          504,
          "MODEL_TIMEOUT",
          "The vehicle assistant did not respond in time.",
        );
      }

      console.error("OpenAI request failed before receiving a response");
      return errorResponse(
        502,
        "MODEL_REQUEST_FAILED",
        "The vehicle assistant is temporarily unavailable.",
      );
    }

    if (!modelResponse.ok) {
      console.error("OpenAI request failed", {
        status: modelResponse.status,
        requestId: modelResponse.headers.get("x-request-id"),
      });
      return errorResponse(
        502,
        "MODEL_REQUEST_FAILED",
        "The vehicle assistant is temporarily unavailable.",
      );
    }

    let responseBody: unknown;

    try {
      responseBody = await modelResponse.json();
    } catch {
      return errorResponse(
        502,
        "INVALID_MODEL_RESPONSE",
        "The vehicle assistant returned an invalid response.",
      );
    }

    const outputText = extractOutputText(responseBody);
    const answer = outputText ? parseStructuredAnswer(outputText) : null;

    if (!answer) {
      return errorResponse(
        502,
        "INVALID_MODEL_RESPONSE",
        "The vehicle assistant returned an invalid response.",
      );
    }

    return Response.json(answer);
  };
}
