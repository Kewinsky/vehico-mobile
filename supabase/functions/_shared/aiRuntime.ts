export type AiFeature =
  | "vehicle_chat"
  | "service_invoice_import"
  | "fuel_receipt_import";

export type AiRuntimeContract = {
  feature: AiFeature;
  promptVersion: string;
  schemaVersion: string;
  defaultModel: string;
  maxOutputTokens: number;
  timeoutMs: number;
};

export const AI_RUNTIME_CONTRACTS: Record<AiFeature, AiRuntimeContract> = {
  vehicle_chat: {
    feature: "vehicle_chat",
    promptVersion: "vehicle_chat_v4",
    schemaVersion: "vehicle_chat_answer_v2",
    defaultModel: "gpt-5.6-luna",
    maxOutputTokens: 1200,
    timeoutMs: 15_000,
  },
  service_invoice_import: {
    feature: "service_invoice_import",
    promptVersion: "service_invoice_v2",
    schemaVersion: "service_invoice_extraction_v2",
    defaultModel: "gpt-5.6-luna",
    maxOutputTokens: 2400,
    timeoutMs: 30_000,
  },
  fuel_receipt_import: {
    feature: "fuel_receipt_import",
    promptVersion: "fuel_receipt_v2",
    schemaVersion: "fuel_receipt_extraction_v2",
    defaultModel: "gpt-5.6-luna",
    maxOutputTokens: 1200,
    timeoutMs: 30_000,
  },
};

export type AiFeatureAccess =
  | { allowed: true }
  | {
      allowed: false;
      reason: "disabled" | "rollout" | "rate_limited" | "budget_exceeded";
      retryAfterSeconds?: number;
    };

export type AiRuntimeSettings = {
  enabled: boolean;
  featureEnabled: boolean;
  rolloutPercent: number;
  primaryModel: string;
  fallbackModel: string | null;
  inputUsdPerMillionTokens: number | null;
  outputUsdPerMillionTokens: number | null;
  fallbackInputUsdPerMillionTokens: number | null;
  fallbackOutputUsdPerMillionTokens: number | null;
};

type ReadEnvironment = (name: string) => string | undefined;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

function parseNumber(
  value: string | undefined,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function featureEnvironmentPrefix(feature: AiFeature): string {
  return `AI_${feature.toUpperCase()}`;
}

export function readAiRuntimeSettings(
  feature: AiFeature,
  readEnvironment: ReadEnvironment,
): AiRuntimeSettings {
  const contract = AI_RUNTIME_CONTRACTS[feature];
  const prefix = featureEnvironmentPrefix(feature);
  const rollout = parseNumber(
    readEnvironment(`${prefix}_ROLLOUT_PERCENT`),
    0,
    100,
  );
  const fallbackModel = readEnvironment(`${prefix}_FALLBACK_MODEL`)?.trim();

  return {
    enabled: parseBoolean(readEnvironment("AI_ENABLED"), true),
    featureEnabled: parseBoolean(
      readEnvironment(`${prefix}_ENABLED`),
      true,
    ),
    rolloutPercent: rollout ?? 100,
    primaryModel:
      readEnvironment(`${prefix}_MODEL`)?.trim() || contract.defaultModel,
    fallbackModel: fallbackModel || null,
    inputUsdPerMillionTokens: parseNumber(
      readEnvironment(`${prefix}_INPUT_USD_PER_MILLION_TOKENS`),
      0,
      1_000_000,
    ),
    outputUsdPerMillionTokens: parseNumber(
      readEnvironment(`${prefix}_OUTPUT_USD_PER_MILLION_TOKENS`),
      0,
      1_000_000,
    ),
    fallbackInputUsdPerMillionTokens: parseNumber(
      readEnvironment(`${prefix}_FALLBACK_INPUT_USD_PER_MILLION_TOKENS`),
      0,
      1_000_000,
    ),
    fallbackOutputUsdPerMillionTokens: parseNumber(
      readEnvironment(`${prefix}_FALLBACK_OUTPUT_USD_PER_MILLION_TOKENS`),
      0,
      1_000_000,
    ),
  };
}

function stableRolloutBucket(userId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function evaluateAiFeatureAccess(
  userId: string,
  settings: AiRuntimeSettings,
): AiFeatureAccess {
  if (!settings.enabled || !settings.featureEnabled) {
    return { allowed: false, reason: "disabled" };
  }
  if (stableRolloutBucket(userId) >= settings.rolloutPercent) {
    return { allowed: false, reason: "rollout" };
  }
  return { allowed: true };
}

export function parseAiBudgetAccess(value: unknown): AiFeatureAccess | null {
  if (!isRecord(value) || typeof value.allowed !== "boolean") return null;
  if (value.allowed) return { allowed: true };
  if (
    value.reason !== "rate_limited" &&
    value.reason !== "budget_exceeded"
  ) {
    return null;
  }
  const retryAfterSeconds = nonNegativeInteger(value.retryAfterSeconds);
  return {
    allowed: false,
    reason: value.reason,
    ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
  };
}

export async function authorizeAiRequest(input: {
  userId: string;
  feature: AiFeature;
  settings: AiRuntimeSettings;
  consumeBudget: (
    reservedOutputTokens: number,
  ) => Promise<AiFeatureAccess>;
}): Promise<AiFeatureAccess> {
  const featureAccess = evaluateAiFeatureAccess(input.userId, input.settings);
  if (!featureAccess.allowed) return featureAccess;
  return input.consumeBudget(
    AI_RUNTIME_CONTRACTS[input.feature].maxOutputTokens * 2,
  );
}

export type AiTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0
    ? value
    : null;
}

export function parseAiTokenUsage(value: unknown): AiTokenUsage | null {
  if (!isRecord(value) || !isRecord(value.usage)) return null;
  const inputTokens = nonNegativeInteger(value.usage.input_tokens);
  const outputTokens = nonNegativeInteger(value.usage.output_tokens);
  const totalTokens = nonNegativeInteger(value.usage.total_tokens);
  if (inputTokens === null || outputTokens === null || totalTokens === null) {
    return null;
  }
  if (totalTokens < inputTokens + outputTokens) return null;
  return { inputTokens, outputTokens, totalTokens };
}

export function estimateAiCostUsdMicros(
  usage: AiTokenUsage,
  settings: AiRuntimeSettings,
  fallbackUsed = false,
): number | null {
  const inputRate = fallbackUsed
    ? settings.fallbackInputUsdPerMillionTokens
    : settings.inputUsdPerMillionTokens;
  const outputRate = fallbackUsed
    ? settings.fallbackOutputUsdPerMillionTokens
    : settings.outputUsdPerMillionTokens;
  if (inputRate === null || outputRate === null) return null;
  return Math.round(
    usage.inputTokens * inputRate + usage.outputTokens * outputRate,
  );
}

export type AiSafeTrace = {
  traceId: string;
  feature: AiFeature;
  promptVersion: string;
  schemaVersion: string;
  model: string;
  fallbackUsed: boolean;
  attemptCount: number;
  outcome: "success" | "rejected" | "error";
  errorCode?: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsdMicros?: number;
};

export function logAiSafeTrace(trace: AiSafeTrace): void {
  console.info("ai_trace", trace);
}

export function buildAiSafeTrace(input: {
  traceId: string;
  feature: AiFeature;
  settings: AiRuntimeSettings;
  model: string;
  fallbackUsed: boolean;
  attemptCount: number;
  outcome: AiSafeTrace["outcome"];
  durationMs: number;
  responseBody?: unknown;
  errorCode?: string;
}): AiSafeTrace {
  const contract = AI_RUNTIME_CONTRACTS[input.feature];
  const usage = parseAiTokenUsage(input.responseBody);
  const estimatedCost = usage
    ? estimateAiCostUsdMicros(usage, input.settings, input.fallbackUsed)
    : null;
  return {
    traceId: input.traceId,
    feature: input.feature,
    promptVersion: contract.promptVersion,
    schemaVersion: contract.schemaVersion,
    model: input.model,
    fallbackUsed: input.fallbackUsed,
    attemptCount: input.attemptCount,
    outcome: input.outcome,
    ...(input.errorCode === undefined ? {} : { errorCode: input.errorCode }),
    durationMs: Math.max(0, Math.round(input.durationMs)),
    ...(usage === null
      ? {}
      : {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        }),
    ...(estimatedCost === null
      ? {}
      : { estimatedCostUsdMicros: estimatedCost }),
  };
}

type CircuitState = { failures: number; openedAt: number | null };

export class AiCircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(
    private readonly failureThreshold = 5,
    private readonly cooldownMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  canRequest(key: string): boolean {
    const state = this.states.get(key);
    if (!state?.openedAt) return true;
    if (this.now() - state.openedAt < this.cooldownMs) return false;
    this.states.set(key, { failures: 0, openedAt: null });
    return true;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string): void {
    const previous = this.states.get(key) ?? { failures: 0, openedAt: null };
    const failures = previous.failures + 1;
    this.states.set(key, {
      failures,
      openedAt: failures >= this.failureThreshold ? this.now() : null,
    });
  }
}

export const sharedAiCircuitBreaker = new AiCircuitBreaker();

export type AiModelExecutionResult =
  | {
      ok: true;
      response: Response;
      model: string;
      fallbackUsed: boolean;
      attemptCount: number;
    }
  | {
      ok: false;
      reason: "circuit_open" | "timeout" | "request_failed";
      attemptCount: number;
      providerStatus?: number;
    };

type AiModelFetch = (input: string, init: RequestInit) => Promise<Response>;

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function isRetryableProviderStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function executeAiModelRequest(input: {
  feature: AiFeature;
  settings: Pick<AiRuntimeSettings, "primaryModel" | "fallbackModel">;
  apiKey: string;
  url: string;
  signal: AbortSignal;
  fetch: AiModelFetch;
  buildBody: (model: string) => string;
  circuitBreaker?: AiCircuitBreaker;
}): Promise<AiModelExecutionResult> {
  const breaker = input.circuitBreaker ?? sharedAiCircuitBreaker;
  const circuitKey = `${input.feature}:${input.settings.primaryModel}`;
  if (!breaker.canRequest(circuitKey)) {
    return { ok: false, reason: "circuit_open", attemptCount: 0 };
  }

  const fallback = input.settings.fallbackModel?.trim();
  const models = fallback && fallback !== input.settings.primaryModel
    ? [input.settings.primaryModel, fallback]
    : [input.settings.primaryModel, input.settings.primaryModel];
  let lastStatus: number | undefined;
  let attemptCount = 0;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;
    attemptCount = index + 1;
    try {
      const response = await input.fetch(input.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: input.buildBody(model),
        signal: input.signal,
      });
      if (response.ok) {
        breaker.recordSuccess(circuitKey);
        return {
          ok: true,
          response,
          model,
          fallbackUsed: index > 0 && model !== input.settings.primaryModel,
          attemptCount: index + 1,
        };
      }
      lastStatus = response.status;
      if (!isRetryableProviderStatus(response.status)) break;
    } catch (error) {
      if (isTimeoutError(error) || input.signal.aborted) {
        breaker.recordFailure(circuitKey);
        return { ok: false, reason: "timeout", attemptCount: index + 1 };
      }
    }
  }

  breaker.recordFailure(circuitKey);
  return {
    ok: false,
    reason: "request_failed",
    attemptCount,
    ...(lastStatus === undefined ? {} : { providerStatus: lastStatus }),
  };
}
