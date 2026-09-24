/** @jest-environment node */

import { createVehicleChatHandler } from "../../../supabase/functions/vehicle-chat/handler";

const REQUEST_URL = "http://localhost/functions/v1/vehicle-chat";
const VALID_ANSWER = {
  answer: "Stop safely and switch off the engine.",
  urgency: "stop_driving",
  uncertainty: "The cause cannot be confirmed remotely.",
  nextStep: "Arrange roadside assistance.",
};

type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

function request(body: string): Request {
  return new Request(REQUEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function modelResponse(output: unknown, status = "completed"): Response {
  return Response.json({
    status,
    output: [
      {
        content: [
          {
            type: "output_text",
            text: JSON.stringify(output),
          },
        ],
      },
    ],
  });
}

function createHandler(fetchModel: jest.MockedFunction<ModelFetch>) {
  return createVehicleChatHandler({
    getOpenAiApiKey: () => "test-api-key",
    hasPremiumAccess: async () => true,
    fetch: fetchModel,
  });
}

async function expectError(
  response: Response,
  status: number,
  code: string,
): Promise<void> {
  await expect(response.json()).resolves.toMatchObject({ error: { code } });
  expect(response.status).toBe(status);
}

describe("vehicle-chat handler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a validated answer from a completed model response", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>().mockResolvedValue(
      modelResponse(VALID_ANSWER),
    );
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(VALID_ANSWER);
    expect(fetchModel).toHaveBeenCalledTimes(1);
  });

  it("rejects users without Premium before calling the model", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      hasPremiumAccess: async () => false,
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 403, "PREMIUM_REQUIRED");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("fails closed when Premium access cannot be verified", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      hasPremiumAccess: async () => {
        throw new Error("database unavailable");
      },
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 503, "AUTHORIZATION_FAILED");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("forwards a bounded conversation history to the model", async () => {
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_ANSWER));
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(
        JSON.stringify({
          message: "Can I drive?",
          language: "en",
          history: [
            { role: "user", content: "The oil warning light is red." },
            { role: "assistant", content: "Stop the engine safely." },
          ],
        }),
      ),
    );

    expect(response.status).toBe(200);
    const requestBody = JSON.parse(
      String(fetchModel.mock.calls[0]?.[1].body),
    ) as { input: unknown[] };
    expect(requestBody.input).toEqual([
      { role: "user", content: "The oil warning light is red." },
      { role: "assistant", content: "Stop the engine safely." },
      { role: "user", content: "Language: en\n\nCan I drive?" },
    ]);
  });

  it("fails safely when the API key is missing", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => undefined,
      hasPremiumAccess: async () => true,
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 500, "SERVER_MISCONFIGURATION");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("returns a timeout error when the model request is interrupted", async () => {
    const timeoutError = new Error("Request timed out");
    timeoutError.name = "TimeoutError";
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockRejectedValue(timeoutError);
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 504, "MODEL_TIMEOUT");
  });

  it("translates an unsuccessful provider response into a safe error", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "x-request-id": "request-id" },
      }),
    );
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 502, "MODEL_REQUEST_FAILED");
  });

  it("rejects a malformed structured answer", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>().mockResolvedValue(
      modelResponse({ ...VALID_ANSWER, urgency: "maybe" }),
    );
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 502, "INVALID_MODEL_RESPONSE");
  });

  it("rejects an incomplete model response", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>().mockResolvedValue(
      modelResponse(VALID_ANSWER, "incomplete"),
    );
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 502, "INVALID_MODEL_RESPONSE");
  });
});
