/** @jest-environment node */

import {
  createServiceInvoiceRequester,
  resolveServiceInvoiceMimeType,
} from "../../services/ai/serviceInvoiceImportRepo";

const EXTRACTION = {
  serviceDate: { value: "2026-09-10", status: "recognized" },
  mileage: { value: 120000, status: "recognized" },
  workshopName: { value: "Workshop", status: "recognized" },
  totalCost: { value: 500, status: "recognized" },
  currency: { value: "PLN", status: "recognized" },
  works: [
    {
      title: "Oil change",
      details: null,
      category: "oil_change",
      categoryStatus: "recognized",
      cost: { value: 500, status: "recognized" },
    },
  ],
};

type TestFetch = Parameters<typeof createServiceInvoiceRequester>[0]["fetch"];

function requester(fetch: jest.MockedFunction<TestFetch>) {
  return createServiceInvoiceRequester({
    baseUrl: "https://supabase.test",
    anonKey: "anon-key",
    getAccessToken: async () => "access-token",
    fetch,
  });
}

describe("serviceInvoiceImportRepo", () => {
  it("sends one authenticated request and returns a validated extraction", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json(EXTRACTION));

    await expect(
      requester(fetch)({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        mimeType: "application/pdf",
        base64: "JVBERg==",
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual(EXTRACTION);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://supabase.test/functions/v1/service-invoice-import",
    );
    expect(fetch.mock.calls[0]?.[1].headers).toMatchObject({
      Authorization: "Bearer access-token",
      apikey: "anon-key",
    });
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual({
      vehicleId: "11111111-1111-4111-8111-111111111111",
      mimeType: "application/pdf",
      base64: "JVBERg==",
    });
  });

  it("rejects a malformed successful response", async () => {
    const fetch = jest
      .fn<ReturnType<TestFetch>, Parameters<TestFetch>>()
      .mockResolvedValue(Response.json({ ...EXTRACTION, works: [] }));

    await expect(
      requester(fetch)({
        vehicleId: "11111111-1111-4111-8111-111111111111",
        mimeType: "application/pdf",
        base64: "JVBERg==",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("normalizes supported MIME types and rejects other extensions", () => {
    expect(resolveServiceInvoiceMimeType("image/jpg", "invoice.jpg")).toBe(
      "image/jpeg",
    );
    expect(resolveServiceInvoiceMimeType(null, "invoice.PDF")).toBe(
      "application/pdf",
    );
    expect(resolveServiceInvoiceMimeType(null, "invoice.docx")).toBeNull();
  });
});
