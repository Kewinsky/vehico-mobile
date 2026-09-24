/** @jest-environment node */

import {
  createVehicleChatRequester,
  VehicleChatError,
} from "../../services/ai/vehicleChatRepo";

const ANSWER = {
  answer: "Stop safely.",
  urgency: "stop_driving" as const,
  uncertainty: "The cause cannot be confirmed remotely.",
  nextStep: "Arrange roadside assistance.",
};

type TestFetch = Parameters<typeof createVehicleChatRequester>[0]["fetch"];

function createRequester(fetch: jest.MockedFunction<TestFetch>) {
  return createVehicleChatRequester({
    baseUrl: "https://supabase.test",
    anonKey: "anon-key",
    fetch,
    getAccessToken: async () => "access-token",
  });
}

describe("vehicleChatRepo", () => {
  it("returns a validated answer and sends bounded conversation history", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json(ANSWER));
    const request = createRequester(fetch);

    await expect(
      request({
        message: "Oil warning light",
        language: "en",
        history: [
          { role: "user", content: "The engine is running." },
          { role: "assistant", content: "Which warning light is on?" },
        ],
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual(ANSWER);

    expect(fetch).toHaveBeenCalledWith(
      "https://supabase.test/functions/v1/vehicle-chat",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          apikey: "anon-key",
          Authorization: "Bearer access-token",
        }),
      }),
    );
    const requestBody = JSON.parse(
      String(fetch.mock.calls[0]?.[1].body),
    ) as { history: unknown[]; stream?: unknown };
    expect(requestBody.history).toHaveLength(2);
    expect(requestBody.stream).toBeUndefined();
  });

  it("requires a signed-in session before making a request", async () => {
    const fetch = jest.fn<ReturnType<TestFetch>, Parameters<TestFetch>>();
    const request = createVehicleChatRequester({
      baseUrl: "https://supabase.test",
      anonKey: "anon-key",
      fetch,
      getAccessToken: async () => null,
    });

    await expect(
      request({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
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
    const request = createRequester(fetch);

    await expect(
      request({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<VehicleChatError>>({
        code: "REQUEST_FAILED",
        message: "Timed out.",
      }),
    );
  });

  it("rejects a malformed successful response", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json({ answer: "Incomplete" }));
    const request = createRequester(fetch);

    await expect(
      request({
        message: "Oil warning light",
        language: "en",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
