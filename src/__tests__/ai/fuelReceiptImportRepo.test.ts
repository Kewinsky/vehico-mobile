/** @jest-environment node */

import {
  createFuelReceiptRequester,
  resolveFuelReceiptMimeType,
} from "../../services/ai/fuelReceiptImportRepo";

const EXTRACTION = {
  date: { value: "2026-10-05", status: "recognized" },
  fuelAmount: { value: 40, status: "recognized" },
  totalCost: { value: 250, status: "recognized" },
  fuelType: { value: "95", status: "recognized" },
  gasStation: { value: "other", status: "uncertain" },
};

type TestFetch = Parameters<typeof createFuelReceiptRequester>[0]["fetch"];

function requester(fetch: jest.MockedFunction<TestFetch>) {
  return createFuelReceiptRequester({
    baseUrl: "https://supabase.test",
    anonKey: "anon-key",
    getAccessToken: async () => "access-token",
    fetch,
  });
}

describe("fuelReceiptImportRepo", () => {
  it("sends an authenticated request and validates OCR fields", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json(EXTRACTION));

    await expect(
      requester(fetch)({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        mimeType: "image/jpeg",
        base64: "/9j/AA==",
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual(EXTRACTION);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://supabase.test/functions/v1/fuel-receipt-import",
    );
    expect(fetch.mock.calls[0]?.[1].headers).toMatchObject({
      Authorization: "Bearer access-token",
      apikey: "anon-key",
    });
  });

  it("rejects malformed successful responses", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(
        Response.json({
          ...EXTRACTION,
          totalCost: { value: null, status: "calculated" },
        }),
      );

    await expect(
      requester(fetch)({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        mimeType: "image/png",
        base64: "iVBORw==",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("accepts rejected fields without values", async () => {
    const extraction = {
      ...EXTRACTION,
      fuelType: { value: null, status: "rejected" },
    };
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json(extraction));

    await expect(
      requester(fetch)({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        mimeType: "image/jpeg",
        base64: "/9j/AA==",
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual(extraction);
  });

  it("supports receipt images and rejects PDF and WebP", () => {
    expect(resolveFuelReceiptMimeType("image/jpg", "receipt.jpg")).toBe(
      "image/jpeg",
    );
    expect(resolveFuelReceiptMimeType(null, "receipt.HEIC")).toBe("image/heic");
    expect(resolveFuelReceiptMimeType(null, "receipt.HEIF")).toBe("image/heif");
    expect(resolveFuelReceiptMimeType(null, "receipt.png")).toBe("image/png");
    expect(resolveFuelReceiptMimeType(null, "receipt.pdf")).toBeNull();
    expect(resolveFuelReceiptMimeType(null, "receipt.webp")).toBeNull();
  });
});
