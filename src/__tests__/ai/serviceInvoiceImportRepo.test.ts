/** @jest-environment node */

import {
  createServiceInvoiceRequester,
  MAX_SERVICE_INVOICE_FILE_BYTES,
  prepareServiceDocumentForAnalysis,
  resolveServiceInvoiceMimeType,
  SERVICE_DOCUMENT_JPEG_QUALITY,
} from "../../services/ai/serviceInvoiceImportRepo";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

jest.mock("expo-file-system/legacy", () => ({
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(resolveServiceInvoiceMimeType("image/heic", "IMG_1234.HEIC")).toBe(
      "image/heic",
    );
    expect(resolveServiceInvoiceMimeType(null, "scan.HEIF")).toBe(
      "image/heif",
    );
    expect(
      resolveServiceInvoiceMimeType("image/webp", "document.webp"),
    ).toBeNull();
    expect(resolveServiceInvoiceMimeType(null, "invoice.docx")).toBeNull();
  });

  it("converts HEIC to a temporary JPEG for analysis", async () => {
    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true, size: 2_000_000 })
      .mockResolvedValueOnce({ exists: true, size: 900_000 });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///cache/converted.jpg",
      width: 2000,
      height: 1500,
    });

    await expect(
      prepareServiceDocumentForAnalysis({
        fileUri: "file:///document.heic",
        mimeType: "image/heic",
        fileSize: 2_000_000,
      }),
    ).resolves.toEqual({
      fileUri: "file:///cache/converted.jpg",
      fileSize: 900_000,
      mimeType: "image/jpeg",
      temporary: true,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///document.heic",
      [],
      { compress: SERVICE_DOCUMENT_JPEG_QUALITY, format: "jpeg" },
    );
  });

  it("keeps supported non-HEIC files unchanged", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 500_000,
    });

    await expect(
      prepareServiceDocumentForAnalysis({
        fileUri: "file:///document.png",
        mimeType: "image/png",
      }),
    ).resolves.toEqual({
      fileUri: "file:///document.png",
      fileSize: 500_000,
      mimeType: "image/png",
      temporary: false,
    });

    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });

  it("rejects and removes an oversized converted image", async () => {
    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true, size: 2_000_000 })
      .mockResolvedValueOnce({
        exists: true,
        size: MAX_SERVICE_INVOICE_FILE_BYTES + 1,
      });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///cache/too-large.jpg",
      width: 4000,
      height: 3000,
    });

    await expect(
      prepareServiceDocumentForAnalysis({
        fileUri: "file:///document.heif",
        mimeType: "image/heif",
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///cache/too-large.jpg",
      { idempotent: true },
    );
  });
});
