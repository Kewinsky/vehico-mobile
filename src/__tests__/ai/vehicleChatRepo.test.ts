/** @jest-environment node */

import {
  createVehicleChatStreamer,
  VehicleChatError,
} from "../../services/ai/vehicleChatRepo";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

const ANSWER = {
  answer: "Stop safely.",
  urgency: "stop_driving" as const,
  uncertainty: "The cause cannot be confirmed remotely.",
  nextStep: "Arrange roadside assistance.",
};

type TestFetch = Parameters<typeof createVehicleChatStreamer>[0]["fetch"];

function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

function createStreamer(fetch: jest.MockedFunction<TestFetch>) {
  return createVehicleChatStreamer({
    baseUrl: "https://supabase.test",
    anonKey: "anon-key",
    fetch,
    getAccessToken: async () => "access-token",
  });
}

describe("vehicleChatRepo", () => {
  it("parses deltas split across network chunks and returns the final answer", async () => {
    const firstEvent = 'event: delta\ndata: {"text":"Stop "}\n\n';
    const secondEvent = 'event: delta\ndata: {"text":"safely."}\n\n';
    const completeEvent = `event: complete\ndata: ${JSON.stringify(ANSWER)}\n\n`;
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(
        sseResponse([
          firstEvent.slice(0, 17),
          firstEvent.slice(17) + secondEvent + completeEvent,
        ]),
      );
    const onDelta = jest.fn();
    const stream = createStreamer(fetch);

    await expect(
      stream({
        message: "Oil warning light",
        language: "en",
        history: [
          { role: "user", content: "The engine is running." },
          { role: "assistant", content: "Which warning light is on?" },
        ],
        signal: new AbortController().signal,
        onDelta,
      }),
    ).resolves.toEqual(ANSWER);

    expect(onDelta.mock.calls.flat()).toEqual(["Stop ", "safely."]);
    expect(fetch).toHaveBeenCalledWith(
      "https://supabase.test/functions/v1/vehicle-chat",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer access-token",
        }),
      }),
    );
    const requestBody = JSON.parse(
      String(fetch.mock.calls[0]?.[1].body),
    ) as { history: unknown[]; stream: boolean };
    expect(requestBody.history).toHaveLength(2);
    expect(requestBody.stream).toBe(true);
  });

  it("requires a signed-in session before making a request", async () => {
    const fetch = jest.fn<ReturnType<TestFetch>, Parameters<TestFetch>>();
    const stream = createVehicleChatStreamer({
      baseUrl: "https://supabase.test",
      anonKey: "anon-key",
      fetch,
      getAccessToken: async () => null,
    });

    await expect(
      stream({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
        onDelta: jest.fn(),
      }),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps an Edge Function error response to a typed error", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(
        Response.json(
          { error: { code: "MODEL_TIMEOUT", message: "Timed out." } },
          { status: 504 },
        ),
      );
    const stream = createStreamer(fetch);

    await expect(
      stream({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
        onDelta: jest.fn(),
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<VehicleChatError>>({
        code: "REQUEST_FAILED",
        message: "Timed out.",
      }),
    );
  });

  it("rejects a stream that ends without a complete event", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(
        sseResponse(['event: delta\ndata: {"text":"Partial"}\n\n']),
      );
    const stream = createStreamer(fetch);

    await expect(
      stream({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
        onDelta: jest.fn(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
