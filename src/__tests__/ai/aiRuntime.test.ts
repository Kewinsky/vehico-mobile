/** @jest-environment node */

import {
  AiCircuitBreaker,
  authorizeAiRequest,
  buildAiSafeTrace,
  executeAiModelRequest,
  estimateAiCostUsdMicros,
  evaluateAiFeatureAccess,
  parseAiTokenUsage,
  readAiRuntimeSettings,
} from "../../../supabase/functions/_shared/aiRuntime";

describe("AI runtime hardening", () => {
  it("supports global and per-feature kill switches", () => {
    const disabled = readAiRuntimeSettings("vehicle_chat", (name) =>
      name === "AI_ENABLED" ? "false" : undefined,
    );
    expect(evaluateAiFeatureAccess("user-1", disabled)).toEqual({
      allowed: false,
      reason: "disabled",
    });

    const featureDisabled = readAiRuntimeSettings(
      "fuel_receipt_import",
      (name) =>
        name === "AI_FUEL_RECEIPT_IMPORT_ENABLED" ? "false" : undefined,
    );
    expect(evaluateAiFeatureAccess("user-1", featureDisabled)).toEqual({
      allowed: false,
      reason: "disabled",
    });
  });

  it("keeps rollout assignment stable and supports zero rollout", () => {
    const settings = readAiRuntimeSettings("vehicle_chat", (name) =>
      name === "AI_VEHICLE_CHAT_ROLLOUT_PERCENT" ? "0" : undefined,
    );
    expect(evaluateAiFeatureAccess("user-1", settings)).toEqual({
      allowed: false,
      reason: "rollout",
    });
  });

  it("reserves the maximum output for both bounded attempts", async () => {
    const consumeBudget = jest.fn(async () => ({ allowed: true as const }));
    const settings = readAiRuntimeSettings("fuel_receipt_import", () => undefined);

    await expect(
      authorizeAiRequest({
        userId: "user-1",
        feature: "fuel_receipt_import",
        settings,
        consumeBudget,
      }),
    ).resolves.toEqual({ allowed: true });
    expect(consumeBudget).toHaveBeenCalledWith(2400);
  });

  it("parses usage and estimates cost only with configured prices", () => {
    const usage = parseAiTokenUsage({
      usage: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 },
    });
    expect(usage).toEqual({
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    });
    const settings = readAiRuntimeSettings("vehicle_chat", (name) => {
      if (name.endsWith("INPUT_USD_PER_MILLION_TOKENS")) return "2";
      if (name.endsWith("OUTPUT_USD_PER_MILLION_TOKENS")) return "8";
      return undefined;
    });
    expect(estimateAiCostUsdMicros(usage!, settings)).toBe(6000);
    expect(parseAiTokenUsage({ usage: { input_tokens: -1 } })).toBeNull();
    expect(
      buildAiSafeTrace({
        traceId: "trace-1",
        feature: "vehicle_chat",
        settings,
        model: "model-1",
        fallbackUsed: false,
        attemptCount: 1,
        outcome: "success",
        durationMs: 12.6,
        responseBody: {
          usage: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 },
        },
      }),
    ).toMatchObject({
      traceId: "trace-1",
      promptVersion: "vehicle_chat_v4",
      inputTokens: 1000,
      estimatedCostUsdMicros: 6000,
      durationMs: 13,
    });
  });

  it("opens and resets a bounded circuit breaker", () => {
    let now = 1000;
    const breaker = new AiCircuitBreaker(2, 500, () => now);
    breaker.recordFailure("chat");
    expect(breaker.canRequest("chat")).toBe(true);
    breaker.recordFailure("chat");
    expect(breaker.canRequest("chat")).toBe(false);
    now += 500;
    expect(breaker.canRequest("chat")).toBe(true);
    breaker.recordFailure("chat");
    breaker.recordSuccess("chat");
    expect(breaker.canRequest("chat")).toBe(true);
  });

  it("retries once with a configured fallback model", async () => {
    const fetch = jest
      .fn<Promise<Response>, [string, RequestInit]>()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ status: "completed" }));

    const result = await executeAiModelRequest({
      feature: "vehicle_chat",
      settings: { primaryModel: "primary", fallbackModel: "fallback" },
      apiKey: "secret",
      url: "https://example.test/responses",
      signal: new AbortController().signal,
      fetch,
      buildBody: (model) => JSON.stringify({ model }),
      circuitBreaker: new AiCircuitBreaker(),
    });

    expect(result).toMatchObject({
      ok: true,
      model: "fallback",
      fallbackUsed: true,
      attemptCount: 2,
    });
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body))).toEqual({
      model: "fallback",
    });
  });

  it("stops immediately when the circuit is open", async () => {
    const breaker = new AiCircuitBreaker(1, 60_000);
    breaker.recordFailure("vehicle_chat:primary");
    const fetch = jest.fn<Promise<Response>, [string, RequestInit]>();

    await expect(
      executeAiModelRequest({
        feature: "vehicle_chat",
        settings: { primaryModel: "primary", fallbackModel: null },
        apiKey: "secret",
        url: "https://example.test/responses",
        signal: new AbortController().signal,
        fetch,
        buildBody: () => "{}",
        circuitBreaker: breaker,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "circuit_open",
      attemptCount: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
