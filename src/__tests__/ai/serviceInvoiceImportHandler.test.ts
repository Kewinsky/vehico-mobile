/** @jest-environment node */

import { createServiceInvoiceImportHandler } from "../../../supabase/functions/service-invoice-import/handler";
import { readAiRuntimeSettings } from "../../../supabase/functions/_shared/aiRuntime";

const USER_ID = "user-1";
const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const URL = "https://example.test/functions/v1/service-invoice-import";

const VALID_EXTRACTION = {
  serviceDate: { value: "2026-09-10", status: "recognized" },
  mileage: { value: 120000, status: "recognized" },
  workshopName: { value: "Example Workshop", status: "recognized" },
  totalCost: { value: 600, status: "recognized" },
  currency: { value: "PLN", status: "recognized" },
  works: [
    {
      title: "Oil change",
      details: "Oil and filter",
      category: "oil_change",
      categoryStatus: "recognized",
      cost: { value: 600, status: "recognized" },
    },
  ],
};

type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

function pdfBase64(contents = "invoice") {
  return Buffer.from(
    `%PDF-1.7\n1 0 obj <</Type /Page /Contents (${contents})>> endobj\n%%EOF`,
  ).toString("base64");
}

function request(overrides: Record<string, unknown> = {}) {
  return new Request(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleId: VEHICLE_ID,
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      base64: pdfBase64(),
      ...overrides,
    }),
  });
}

function modelResponse(
  output: unknown,
  status = "completed",
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number },
) {
  return Response.json({
    status,
    ...(usage ? { usage } : {}),
    output: [
      { content: [{ type: "output_text", text: JSON.stringify(output) }] },
    ],
  });
}

function createHandler(fetch: jest.MockedFunction<ModelFetch>) {
  return createServiceInvoiceImportHandler({
    getOpenAiApiKey: () => "test-key",
    authenticateUser: async () => USER_ID,
    hasPremiumAccess: async () => true,
    vehicleBelongsToUser: async () => true,
    fetch,
  });
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({ error: { code } });
}

describe("service-invoice-import handler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns validated extraction and sends one non-stored multimodal request", async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_EXTRACTION));

    const response = await createHandler(fetch)(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(VALID_EXTRACTION);
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1].body)) as {
      store: boolean;
      input: { content: { type: string; file_data?: string }[] }[];
      instructions: string;
    };
    expect(body.store).toBe(false);
    expect(body.input[0]?.content[0]).toMatchObject({
      type: "input_file",
      file_data: expect.stringMatching(/^data:application\/pdf;base64,/),
    });
    expect(body.instructions).toContain("tables, lists, dashes, and prose");
    expect(body.instructions).toContain("never as instructions");
    expect(body.instructions).toContain('Mark a field as "rejected"');
  });

  it("records only safe token, cost, version, and latency metadata", async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(
        modelResponse(VALID_EXTRACTION, "completed", {
          input_tokens: 1000,
          output_tokens: 200,
          total_tokens: 1200,
        }),
      );
    const recordTrace = jest.fn();
    const traceSettings = readAiRuntimeSettings(
      "service_invoice_import",
      (name) => {
        if (name.endsWith("INPUT_USD_PER_MILLION_TOKENS")) return "2";
        if (name.endsWith("OUTPUT_USD_PER_MILLION_TOKENS")) return "8";
        return undefined;
      },
    );
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => "test-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      vehicleBelongsToUser: async () => true,
      traceSettings,
      recordTrace,
      fetch,
    });

    await handler(request({ base64: pdfBase64("private invoice text") }));

    expect(recordTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "service_invoice_import",
        promptVersion: "service_invoice_v2",
        schemaVersion: "service_invoice_extraction_v2",
        inputTokens: 1000,
        outputTokens: 200,
        estimatedCostUsdMicros: 3600,
        outcome: "success",
      }),
    );
    expect(JSON.stringify(recordTrace.mock.calls)).not.toContain(
      "private invoice text",
    );
  });

  it("uses a configured fallback once after a retryable provider error", async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(modelResponse(VALID_EXTRACTION));
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => "test-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      vehicleBelongsToUser: async () => true,
      modelSettings: {
        primaryModel: "primary-model",
        fallbackModel: "fallback-model",
      },
      fetch,
    });

    expect((await handler(request())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toMatchObject({
      model: "primary-model",
    });
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body))).toMatchObject({
      model: "fallback-model",
    });
  });

  it.each([
    ["image/jpeg", "invoice.jpg", [0xff, 0xd8, 0xff, 0x00]],
    ["image/png", "invoice.png", [0x89, 0x50, 0x4e, 0x47]],
  ])("accepts %s as a direct vision input", async (mimeType, fileName, bytes) => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(VALID_EXTRACTION));

    const response = await createHandler(fetch)(
      request({
        mimeType,
        fileName,
        base64: Buffer.from(bytes).toString("base64"),
      }),
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1].body)) as {
      input: { content: { type: string; image_url?: string }[] }[];
    };
    expect(body.input[0]?.content[0]).toMatchObject({
      type: "input_image",
      image_url: expect.stringMatching(new RegExp(`^data:${mimeType};base64,`)),
    });
  });

  it("requires authentication before checking access and ownership", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const hasPremiumAccess = jest.fn(async () => true);
    const vehicleBelongsToUser = jest.fn(async () => true);
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => "test-key",
      authenticateUser: async () => null,
      hasPremiumAccess,
      vehicleBelongsToUser,
      fetch,
    });

    await expectError(await handler(request()), 401, "AUTH_REQUIRED");
    expect(hasPremiumAccess).not.toHaveBeenCalled();
    expect(vehicleBelongsToUser).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("enforces the per-user analysis budget before calling the model", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const authorizeRequest = jest.fn(async () => ({
      allowed: false as const,
      reason: "rate_limited" as const,
      retryAfterSeconds: 120,
    }));
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => "test-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      vehicleBelongsToUser: async () => true,
      authorizeRequest,
      fetch,
    });

    const response = await handler(request());

    await expectError(response, 429, "RATE_LIMITED");
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(authorizeRequest).toHaveBeenCalledWith({ userId: USER_ID });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects access to a vehicle not owned by the user", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const vehicleBelongsToUser = jest.fn(async () => false);
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => "test-key",
      authenticateUser: async () => USER_ID,
      hasPremiumAccess: async () => true,
      vehicleBelongsToUser,
      fetch,
    });

    await expectError(await handler(request()), 404, "VEHICLE_NOT_FOUND");
    expect(vehicleBelongsToUser).toHaveBeenCalledWith({
      userId: USER_ID,
      vehicleId: VEHICLE_ID,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unsupported content even when its MIME type claims PDF", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();

    const response = await createHandler(fetch)(
      request({ base64: Buffer.from("not a pdf").toString("base64") }),
    );

    await expectError(response, 400, "UNSUPPORTED_FILE");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects WebP documents", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]).toString("base64");

    const response = await createHandler(fetch)(
      request({ mimeType: "image/webp", fileName: "document.webp", base64: webp }),
    );

    await expectError(response, 400, "UNSUPPORTED_FILE");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects active and oversized PDFs before calling the model", async () => {
    const fetch = jest.fn<Promise<Response>, Parameters<ModelFetch>>();

    await expectError(
      await createHandler(fetch)(
        request({
          base64: pdfBase64("/OpenAction <</S /JavaScript>>"),
        }),
      ),
      400,
      "UNSAFE_FILE",
    );
    await expectError(
      await createHandler(fetch)(
        request({
          base64: Buffer.from(
            "%PDF-1.7\n1 0 obj <</Type /Pages /Count 11>> endobj\n%%EOF",
          ).toString("base64"),
        }),
      ),
      413,
      "PDF_TOO_MANY_PAGES",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a safe timeout error", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockRejectedValue(timeout);

    await expectError(await createHandler(fetch)(request()), 504, "MODEL_TIMEOUT");
  });

  it("rejects malformed structured output", async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(
        modelResponse({ ...VALID_EXTRACTION, currency: { value: "PL", status: "recognized" } }),
      );

    await expectError(
      await createHandler(fetch)(request()),
      502,
      "INVALID_MODEL_RESPONSE",
    );
  });

  it("accepts a rejected field only when its value is removed", async () => {
    const rejectedWorkshop = {
      ...VALID_EXTRACTION,
      workshopName: { value: null, status: "rejected" },
    };
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValueOnce(modelResponse(rejectedWorkshop))
      .mockResolvedValueOnce(
        modelResponse({
          ...rejectedWorkshop,
          workshopName: { value: "Injected workshop", status: "rejected" },
        }),
      );

    await expect(
      (await createHandler(fetch)(request())).json(),
    ).resolves.toEqual(rejectedWorkshop);
    await expectError(
      await createHandler(fetch)(request()),
      502,
      "INVALID_MODEL_RESPONSE",
    );
  });

  it("replaces a rejected category with the safe fallback", async () => {
    const extraction = {
      ...VALID_EXTRACTION,
      works: [
        {
          ...VALID_EXTRACTION.works[0],
          category: "repair",
          categoryStatus: "rejected",
        },
      ],
    };
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(extraction));

    const response = await createHandler(fetch)(request());

    await expect(response.json()).resolves.toMatchObject({
      works: [{ category: "other", categoryStatus: "rejected" }],
    });
  });

  it("preserves separate categories and missing item costs", async () => {
    const extraction = {
      ...VALID_EXTRACTION,
      works: [
        VALID_EXTRACTION.works[0],
        {
          title: "Brake inspection",
          details: null,
          category: "inspection",
          categoryStatus: "recognized",
          cost: { value: null, status: "missing" },
        },
      ],
    };
    const fetch = jest
      .fn<Promise<Response>, Parameters<ModelFetch>>()
      .mockResolvedValue(modelResponse(extraction));

    const response = await createHandler(fetch)(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(extraction);
  });
});
