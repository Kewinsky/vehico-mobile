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
  stream: boolean;
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
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "SERVER_MISCONFIGURATION"
  | "MODEL_TIMEOUT"
  | "MODEL_REQUEST_FAILED"
  | "INVALID_MODEL_RESPONSE";

type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

interface VehicleChatHandlerDependencies {
  getOpenAiApiKey: () => string | undefined;
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
  const stream = "stream" in value ? value.stream : false;
  const history = "history" in value ? value.history : [];

  if (
    typeof message !== "string" ||
    (language !== "pl" && language !== "en") ||
    typeof stream !== "boolean" ||
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
    stream,
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
    stream: request.stream,
  });
}

function sseEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function eventData(frame: string): string | null {
  const dataLines = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  return dataLines.length > 0 ? dataLines.join("\n") : null;
}

function extractAnswerPrefix(json: string): string | null {
  const match = /"answer"\s*:\s*"/.exec(json);
  if (!match) return null;

  let encoded = "";
  let index = match.index + match[0].length;

  while (index < json.length) {
    const character = json[index];

    if (character === '"') break;

    if (character !== "\\") {
      encoded += character;
      index += 1;
      continue;
    }

    if (index + 1 >= json.length) break;

    const escape = json[index + 1];
    if (escape === "u") {
      const unicodeEscape = json.slice(index, index + 6);
      if (!/^\\u[0-9a-fA-F]{4}$/.test(unicodeEscape)) break;
      encoded += unicodeEscape;
      index += 6;
      continue;
    }

    if (!'"\\/bfnrt'.includes(escape)) break;
    encoded += `\\${escape}`;
    index += 2;
  }

  try {
    return JSON.parse(`"${encoded}"`) as string;
  } catch {
    return null;
  }
}

function streamResponse(modelResponse: Response): Response {
  const modelBody = modelResponse.body;

  if (!modelBody) {
    return errorResponse(
      502,
      "INVALID_MODEL_RESPONSE",
      "The vehicle assistant returned an invalid response.",
    );
  }

  const reader = modelBody.getReader();
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = "";
      let outputText = "";
      let streamedAnswer = "";
      let completed = false;

      const fail = (code: ErrorCode, message: string) => {
        if (cancelled) return;
        controller.enqueue(sseEvent("error", { code, message }));
        controller.close();
      };

      const processFrame = (frame: string): boolean => {
        const data = eventData(frame);
        if (!data || data === "[DONE]") return true;

        let event: unknown;
        try {
          event = JSON.parse(data);
        } catch {
          fail(
            "INVALID_MODEL_RESPONSE",
            "The vehicle assistant returned an invalid response.",
          );
          return false;
        }

        if (typeof event !== "object" || event === null || !("type" in event)) {
          return true;
        }

        if (
          event.type === "response.output_text.delta" &&
          "delta" in event &&
          typeof event.delta === "string"
        ) {
          outputText += event.delta;
          const answerPrefix = extractAnswerPrefix(outputText);
          if (answerPrefix !== null && answerPrefix.length > streamedAnswer.length) {
            const delta = answerPrefix.slice(streamedAnswer.length);
            streamedAnswer = answerPrefix;
            controller.enqueue(sseEvent("delta", { text: delta }));
          }
          return true;
        }

        if (event.type === "response.completed") {
          const answer = parseStructuredAnswer(outputText);
          if (!answer || !answer.answer.startsWith(streamedAnswer)) {
            fail(
              "INVALID_MODEL_RESPONSE",
              "The vehicle assistant returned an invalid response.",
            );
            return false;
          }

          const remainingText = answer.answer.slice(streamedAnswer.length);
          if (remainingText.length > 0) {
            controller.enqueue(sseEvent("delta", { text: remainingText }));
          }
          controller.enqueue(sseEvent("complete", answer));
          controller.close();
          completed = true;
          return false;
        }

        if (event.type === "error" || event.type === "response.incomplete") {
          fail(
            "MODEL_REQUEST_FAILED",
            "The vehicle assistant is temporarily unavailable.",
          );
          return false;
        }

        return true;
      };

      try {
        while (!cancelled && !completed) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");
          let separatorIndex = buffer.indexOf("\n\n");

          while (separatorIndex >= 0) {
            const frame = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            if (!processFrame(frame)) return;
            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        if (!cancelled && !completed) {
          fail(
            "INVALID_MODEL_RESPONSE",
            "The vehicle assistant returned an incomplete response.",
          );
        }
      } catch (error) {
        if (cancelled) return;
        fail(
          isTimeoutError(error) ? "MODEL_TIMEOUT" : "MODEL_REQUEST_FAILED",
          isTimeoutError(error)
            ? "The vehicle assistant did not respond in time."
            : "The vehicle assistant is temporarily unavailable.",
        );
      }
    },
    cancel() {
      cancelled = true;
      return reader.cancel();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function createVehicleChatHandler({
  getOpenAiApiKey,
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
        "Message, language, stream, or bounded conversation history is invalid.",
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
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
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

    if (request.stream) return streamResponse(modelResponse);

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
