/** @jest-environment node */

import { createVehicleChatHandler } from "../../../supabase/functions/vehicle-chat/handler";

const REQUEST_URL = "http://localhost/functions/v1/vehicle-chat";
const USER_ID = "user-1";
const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const PUBLIC_ANSWER = {
  answer: "Stop safely and switch off the engine.",
};
const VALID_ANSWER = {
  answer: PUBLIC_ANSWER.answer,
  urgency: "stop_driving",
  uncertainty: "The cause cannot be confirmed remotely.",
  nextStep: "Arrange roadside assistance.",
  citations: [],
};

const VALID_VEHICLE = {
  id: VEHICLE_ID,
  owner_id: USER_ID,
  type: "car",
  vin: "TESTVIN123456789",
  make: "Toyota",
  model: "Corolla",
  production_year: 2020,
  initial_mileage: 10_000,
  mileage: 80_000,
  mileage_updated_at: "2026-09-01",
  first_registration_date: "2020-06-01",
  license_plate: "TEST 123",
  engine_capacity: 1798,
  power_hp: 122,
  fuel_type: "hybrid",
  transmission: "automatic",
  drive_type: "FWD",
  notes: "Engine code entered by the user: 2ZR-FXE",
  insurance_valid_until: "2027-01-01",
  ac_valid_until: null,
  inspection_valid_until: "2027-02-01",
  intake_enabled: false,
  created_at: "2025-01-01T12:00:00Z",
};

const VALID_SERVICE_ENTRY = {
  id: SERVICE_ID,
  vehicle_id: VEHICLE_ID,
  service_date: "2026-08-10",
  mileage: 78_000,
  category: "maintenance",
  title: "Engine oil replacement",
  description: "Oil and filter replaced.",
  cost: 450,
  workshop_id: null,
  workshop_snapshot: "Example Workshop",
  status: "approved",
};

type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

function request(body: string, signal?: AbortSignal): Request {
  let requestBody = body;
  try {
    requestBody = JSON.stringify({
      vehicleId: VEHICLE_ID,
      ...(JSON.parse(body) as Record<string, unknown>),
    });
  } catch {
    // Preserve malformed JSON for validation tests.
  }

  return new Request(REQUEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
    signal,
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
    authenticateUser: async () => USER_ID,
    hasPremiumAccess: async () => true,
    loadVehicleContext: async () => ({
      vehicle: VALID_VEHICLE,
      serviceHistory: [VALID_SERVICE_ENTRY],
    }),
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

function vehicleContextFromFetch(
  fetchModel: jest.MockedFunction<ModelFetch>,
): Record<string, unknown> {
  const requestBody = JSON.parse(
    String(fetchModel.mock.calls[0]?.[1].body),
  ) as { input: { role: string; content: string }[] };
  const contextMessage = requestBody.input.find(
    (message) => message.role === "developer",
  );
  const match = contextMessage?.content.match(
    /<vehicle_context>(.*)<\/vehicle_context>/s,
  );
  if (!match?.[1]) throw new Error("Vehicle context was not sent");
  return JSON.parse(match[1]) as Record<string, unknown>;
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
    await expect(response.json()).resolves.toEqual(PUBLIC_ANSWER);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    const modelRequest = JSON.parse(
      String(fetchModel.mock.calls[0]?.[1].body),
    ) as { instructions: string; max_output_tokens: number };
    expect(modelRequest.max_output_tokens).toBe(1200);
    expect(modelRequest.instructions).toContain(
      "readable bullet list with one record per line",
    );
    expect(modelRequest.instructions).toContain(
      "Never use the em dash character (U+2014)",
    );
  });

  it("requires an authenticated user before checking access or loading context", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const hasPremiumAccess = jest.fn(async () => true);
    const loadVehicleContext = jest.fn(async () => ({
      vehicle: VALID_VEHICLE,
      serviceHistory: [],
    }));
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => null,
      hasPremiumAccess,
      loadVehicleContext,
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 401, "AUTH_REQUIRED");
    expect(hasPremiumAccess).not.toHaveBeenCalled();
    expect(loadVehicleContext).not.toHaveBeenCalled();
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("loads only the requested user's vehicle and hides missing or foreign vehicles", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const loadVehicleContext = jest.fn(async () => ({
      vehicle: null,
      serviceHistory: [],
    }));
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext,
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 404, "VEHICLE_NOT_FOUND");
    expect(loadVehicleContext).toHaveBeenCalledWith({
      userId: USER_ID,
      vehicleId: VEHICLE_ID,
    });
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("rejects context when the returned vehicle belongs to another user", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: { ...VALID_VEHICLE, owner_id: "user-2" },
        serviceHistory: [VALID_SERVICE_ENTRY],
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 404, "VEHICLE_NOT_FOUND");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("validates citations internally without exposing them to the client", async () => {
    const pendingId = "33333333-3333-4333-8333-333333333333";
    const otherVehicleId = "44444444-4444-4444-8444-444444444444";
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(
        modelResponse({ ...VALID_ANSWER, citations: [0] }),
      );
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [
          VALID_SERVICE_ENTRY,
          { ...VALID_SERVICE_ENTRY, id: pendingId, status: "pending" },
          {
            ...VALID_SERVICE_ENTRY,
            id: otherVehicleId,
            vehicle_id: otherVehicleId,
          },
        ],
        fuelingEntries: [
          { id: "f1", date: "2026-08-01", distance: 500, fuel_amount: 40, fuel_cost: 250, fuel_type: "petrol", gas_station: "Station", created_at: "secret" },
          { id: "f2", date: "2026-09-01", distance: 600, fuel_amount: 42, fuel_cost: 270, fuel_type: "petrol", gas_station: "Station", created_at: "secret" },
        ],
        reminders: [{ id: "r1", vehicle_id: VEHICLE_ID, due_date: "2027-01-01", due_mileage: null, days_before: 7, title: "Inspection", notes: null, status: "active", channel_email: false, channel_push: true, enabled: true, delivered_at: null, recurrence_interval_value: null, recurrence_interval_unit: null, recurrence_interval_km: null, recurrence_anchor_mileage: null, created_at: "secret" }],
        tires: [{ id: "t1", vehicle_id: VEHICLE_ID, name: "Winter", width_mm: 205, aspect_ratio: 55, diameter_inch: 16, tire_type: "winter", dot: "2425", is_currently_fitted: true, created_at: "secret" }],
        wheels: [{ id: "w1", vehicle_id: VEHICLE_ID, name: "OEM", width_inch: 7, diameter_inch: 16, et_offset: 40, bolt_pattern: "5x114.3", center_bore_mm: 60.1, bolt_type: "bolt", weight_kg: 9, is_currently_fitted: true, created_at: "secret" }],
        equipment: [{ id: "e1", vehicle_id: VEHICLE_ID, preset_key: "heated_seats", label: "Heated seats", created_at: "secret" }],
        workshops: [{ id: "ws1", name: "Example Workshop", workshop_type: "mechanic", phone_number: "123", address: "Main St", created_at: "secret" }],
        reports: [{ id: "rp1", snapshot_data: { mileage: 75_000 } }],
        marketplacePosts: [{ id: "p1", title: "Corolla for sale" }],
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "When was the oil changed?", language: "en" })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(PUBLIC_ANSWER);
    const context = vehicleContextFromFetch(fetchModel);
    expect(context.service_history).toEqual([
      {
        date: VALID_SERVICE_ENTRY.service_date,
        title: VALID_SERVICE_ENTRY.title,
        mileage: VALID_SERVICE_ENTRY.mileage,
        cost: VALID_SERVICE_ENTRY.cost,
        workshop: VALID_SERVICE_ENTRY.workshop_snapshot,
      },
    ]);
    expect(context.profile).toEqual(
      expect.objectContaining({
        notes: VALID_VEHICLE.notes,
      }),
    );
    expect(context).not.toHaveProperty("mileage_audit");
    expect(context.fueling_entries).toEqual([
      {
        date: "2026-08-01",
        fuel_cost: 250,
        fuel_type: "petrol",
        gas_station: "Station",
        distance: 500,
      },
      {
        date: "2026-09-01",
        fuel_cost: 270,
        fuel_type: "petrol",
        gas_station: "Station",
        distance: 600,
      },
    ]);
    expect(context).not.toHaveProperty("fuel_summary");
    expect(context).not.toHaveProperty("reports");
    expect(context).not.toHaveProperty("marketplace_posts");
    const serializedContext = JSON.stringify(context);
    for (const forbidden of ["TESTVIN123456789", "TEST 123", "owner_id", "intake_token", "created_at", "workshop_id", SERVICE_ID]) {
      expect(serializedContext).not.toContain(forbidden);
    }
  });

  it("represents empty history, unknown engine details, and conflicting mileage explicitly", async () => {
    const olderId = "55555555-5555-4555-8555-555555555555";
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_ANSWER));
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: { ...VALID_VEHICLE, mileage: 70_000 },
        serviceHistory: [
          VALID_SERVICE_ENTRY,
          {
            ...VALID_SERVICE_ENTRY,
            id: olderId,
            service_date: "2025-08-10",
            mileage: 90_000,
          },
        ],
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Review the history", language: "en" })),
    );

    expect(response.status).toBe(200);
    const context = vehicleContextFromFetch(fetchModel);
    expect(context.unknown_data).toEqual(
      expect.arrayContaining([
        "verified_exact_vehicle_variant",
        "verified_engine_code",
      ]),
    );
    expect(context.conflicts).toEqual(
      expect.arrayContaining([
        "service_history_mileage_regression",
        "profile_mileage_below_service_history",
      ]),
    );

    fetchModel.mockClear();
    const emptyHistoryHandler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [],
      }),
      fetch: fetchModel,
    });
    await emptyHistoryHandler(
      request(JSON.stringify({ message: "Review the history", language: "en" })),
    );
    expect(vehicleContextFromFetch(fetchModel).service_history).toEqual([]);
  });

  it("sends only the 100 most recent service records", async () => {
    const serviceHistory = Array.from({ length: 501 }, (_, index) => ({
      ...VALID_SERVICE_ENTRY,
      id: `77777777-7777-4777-8777-${String(index).padStart(12, "0")}`,
    }));
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_ANSWER));
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory,
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Review the history", language: "en" })),
    );

    expect(response.status).toBe(200);
    expect(vehicleContextFromFetch(fetchModel).service_history).toHaveLength(
      100,
    );
  });

  it("sends only the 100 most recent fuel records", async () => {
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_ANSWER));
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [],
        fuelingEntries: Array.from({ length: 501 }, () => ({
          date: "2026-09-01",
          distance: 500,
          fuel_cost: "240",
          fuel_type: "95",
          gas_station: "orlen",
          created_at: "must-not-reach-the-model",
        })),
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(
        JSON.stringify({ message: "Summarize fuel costs", language: "en" }),
      ),
    );

    expect(response.status).toBe(200);
    expect(vehicleContextFromFetch(fetchModel).fueling_entries).toHaveLength(
      100,
    );
  });

  it("rejects a complete snapshot that exceeds the total context budget", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: { ...VALID_VEHICLE, notes: "x".repeat(120_000) },
        serviceHistory: [],
      }),
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Review my data", language: "en" })),
    );

    await expectError(response, 413, "CONTEXT_TOO_LARGE");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("rejects citations to records outside the supplied context", async () => {
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(
        modelResponse({ ...VALID_ANSWER, citations: [1] }),
      );
    const handler = createHandler(fetchModel);

    const response = await handler(
      request(JSON.stringify({ message: "When was the oil changed?", language: "en" })),
    );

    await expectError(response, 502, "INVALID_MODEL_RESPONSE");
  });

  it("fails closed when vehicle context cannot be loaded", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => {
        throw new Error("database unavailable");
      },
      fetch: fetchModel,
    });

    const response = await handler(
      request(JSON.stringify({ message: "Oil warning light", language: "en" })),
    );

    await expectError(response, 503, "CONTEXT_LOAD_FAILED");
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("rejects users without Premium before calling the model", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => "test-api-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => false,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [],
      }),
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
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => {
        throw new Error("database unavailable");
      },
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [],
      }),
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
      expect.objectContaining({ role: "developer" }),
      { role: "user", content: "Language: en\n\nCan I drive?" },
    ]);
  });

  it("fails safely when the API key is missing", async () => {
    const fetchModel = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => undefined,
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      loadVehicleContext: async () => ({
        vehicle: VALID_VEHICLE,
        serviceHistory: [],
      }),
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

  it("propagates client cancellation to the model request", async () => {
    const requestController = new AbortController();
    let startModelRequest: (() => void) | undefined;
    const modelRequestStarted = new Promise<void>((resolve) => {
      startModelRequest = resolve;
    });
    let modelSignal: AbortSignal | null = null;
    const fetchModel = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockImplementation((_input, init) => {
        modelSignal = init.signal as AbortSignal;
        startModelRequest?.();

        return new Promise((_resolve, reject) => {
          modelSignal?.addEventListener("abort", () => {
            const abortError = new Error("Request aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      });
    const handler = createHandler(fetchModel);

    const responsePromise = handler(
      request(
        JSON.stringify({ message: "Oil warning light", language: "en" }),
        requestController.signal,
      ),
    );
    await modelRequestStarted;
    requestController.abort();

    const response = await responsePromise;
    await expectError(response, 504, "MODEL_TIMEOUT");
    expect(modelSignal?.aborted).toBe(true);
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
