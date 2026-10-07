import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import {
  isAiImportFieldStatus,
  isAiImportFieldValuePresenceValid,
  type AiImportFieldStatus,
} from "../../../shared/ai/importContract";
import { ENV } from "../../config/env";
import type { ServiceEntryCategory } from "../../types/domain";
import { supabase } from "../supabase/client";

export const MAX_SERVICE_INVOICE_FILE_BYTES = 10 * 1024 * 1024;

export type ServiceInvoiceMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png";

export type ServiceInvoiceSourceMimeType =
  | ServiceInvoiceMimeType
  | "image/heic"
  | "image/heif";

export const SERVICE_DOCUMENT_JPEG_QUALITY = 0.82;

export type ServiceInvoiceFieldStatus = AiImportFieldStatus;

export type ServiceInvoiceField<T> = {
  value: T | null;
  status: ServiceInvoiceFieldStatus;
};

export type ServiceInvoiceExtraction = {
  serviceDate: ServiceInvoiceField<string>;
  mileage: ServiceInvoiceField<number>;
  workshopName: ServiceInvoiceField<string>;
  totalCost: ServiceInvoiceField<number>;
  currency: ServiceInvoiceField<string>;
  works: {
    title: string;
    details: string | null;
    category: ServiceEntryCategory;
    categoryStatus: ServiceInvoiceFieldStatus;
    cost: ServiceInvoiceField<number>;
  }[];
};

export type ServiceInvoiceImportErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED"
  | "MODEL_TIMEOUT"
  | "INVALID_MODEL_RESPONSE"
  | "MODEL_REQUEST_FAILED";

export class ServiceInvoiceImportError extends Error {
  constructor(
    public readonly code: ServiceInvoiceImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceInvoiceImportError";
  }
}

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type ServiceInvoiceFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<FetchResponse>;

type ServiceInvoiceDependencies = {
  baseUrl: string;
  anonKey: string;
  fetch: ServiceInvoiceFetch;
  getAccessToken: () => Promise<string | null>;
};

type RequestInput = {
  vehicleId: string;
  mimeType: ServiceInvoiceMimeType;
  base64: string;
  signal: AbortSignal;
};

type ErrorPayload = { error: { code: string; message: string } };

const SERVICE_CATEGORIES: readonly ServiceEntryCategory[] = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_change",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStatus(value: unknown): value is ServiceInvoiceFieldStatus {
  return isAiImportFieldStatus(value);
}

function parseField<T>(
  value: unknown,
  isValue: (candidate: unknown) => candidate is T,
): ServiceInvoiceField<T> | null {
  if (
    !isRecord(value) ||
    !isStatus(value.status) ||
    (value.value !== null && !isValue(value.value)) ||
    !isAiImportFieldValuePresenceValid(value.status, value.value)
  ) {
    return null;
  }
  return { value: value.value as T | null, status: value.status };
}

function parseExtraction(value: unknown): ServiceInvoiceExtraction | null {
  if (!isRecord(value) || !Array.isArray(value.works) || value.works.length === 0) {
    return null;
  }

  const serviceDate = parseField(value.serviceDate, (item): item is string =>
    typeof item === "string",
  );
  const mileage = parseField(value.mileage, (item): item is number =>
    typeof item === "number" && Number.isFinite(item),
  );
  const workshopName = parseField(
    value.workshopName,
    (item): item is string => typeof item === "string",
  );
  const totalCost = parseField(value.totalCost, (item): item is number =>
    typeof item === "number" && Number.isFinite(item),
  );
  const currency = parseField(value.currency, (item): item is string =>
    typeof item === "string",
  );
  if (!serviceDate || !mileage || !workshopName || !totalCost || !currency) {
    return null;
  }

  const works = value.works.map((work) => {
    if (
      !isRecord(work) ||
      typeof work.title !== "string" ||
      work.title.trim().length === 0 ||
      (work.details !== null && typeof work.details !== "string") ||
      !SERVICE_CATEGORIES.includes(work.category as ServiceEntryCategory) ||
      !isStatus(work.categoryStatus) ||
      ((work.categoryStatus === "missing" ||
        work.categoryStatus === "rejected") &&
        work.category !== "other")
    ) {
      return null;
    }
    const cost = parseField(work.cost, (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
    );
    if (!cost) return null;
    return {
      title: work.title.trim(),
      details: typeof work.details === "string" ? work.details.trim() || null : null,
      category: work.category as ServiceEntryCategory,
      categoryStatus: work.categoryStatus,
      cost,
    };
  });
  if (works.some((work) => work === null)) return null;

  return {
    serviceDate,
    mileage,
    workshopName,
    totalCost,
    currency,
    works: works as ServiceInvoiceExtraction["works"],
  };
}

function parseErrorPayload(value: unknown): ErrorPayload | null {
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string" ||
    typeof value.error.message !== "string"
  ) {
    return null;
  }
  return { error: { code: value.error.code, message: value.error.message } };
}

function serverErrorCode(code: string): ServiceInvoiceImportErrorCode {
  if (code === "FILE_TOO_LARGE") return "FILE_TOO_LARGE";
  if (code === "MODEL_TIMEOUT") return "MODEL_TIMEOUT";
  if (code === "INVALID_MODEL_RESPONSE") return "INVALID_MODEL_RESPONSE";
  if (code === "MODEL_REQUEST_FAILED") return "MODEL_REQUEST_FAILED";
  return "REQUEST_FAILED";
}

async function responseError(response: FetchResponse) {
  try {
    const payload = parseErrorPayload(await response.json());
    if (payload) {
      return new ServiceInvoiceImportError(
        serverErrorCode(payload.error.code),
        payload.error.message,
      );
    }
  } catch {
    // Return the stable fallback below when the server body is unreadable.
  }
  return new ServiceInvoiceImportError(
    "REQUEST_FAILED",
    `Document import failed with status ${response.status}.`,
  );
}

export function createServiceInvoiceRequester({
  baseUrl,
  anonKey,
  fetch,
  getAccessToken,
}: ServiceInvoiceDependencies) {
  return async function requestServiceInvoice({
    vehicleId,
    mimeType,
    base64,
    signal,
  }: RequestInput): Promise<ServiceInvoiceExtraction> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new ServiceInvoiceImportError(
        "AUTH_REQUIRED",
        "An authenticated session is required.",
      );
    }

    let response: FetchResponse;
    try {
      response = await fetch(
        `${baseUrl}/functions/v1/service-invoice-import`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vehicleId, mimeType, base64 }),
          signal,
        },
      );
    } catch (error) {
      if (signal.aborted) throw error;
      throw new ServiceInvoiceImportError(
        "NETWORK_ERROR",
        "Could not connect to document analysis.",
      );
    }

    if (!response.ok) throw await responseError(response);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ServiceInvoiceImportError(
        "INVALID_RESPONSE",
        "Document analysis returned an invalid response.",
      );
    }
    const extraction = parseExtraction(body);
    if (!extraction) {
      throw new ServiceInvoiceImportError(
        "INVALID_RESPONSE",
        "Document analysis returned an invalid response.",
      );
    }
    return extraction;
  };
}

export function resolveServiceInvoiceMimeType(
  mimeType: string | null | undefined,
  fileName: string,
): ServiceInvoiceSourceMimeType | null {
  const normalized = mimeType?.toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if (
    normalized === "application/pdf" ||
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/heic" ||
    normalized === "image/heif"
  ) {
    return normalized;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return null;
}

type PreparedServiceDocument = {
  fileUri: string;
  fileSize?: number;
  mimeType: ServiceInvoiceMimeType;
  temporary: boolean;
};

async function deleteTemporaryFile(fileUri: string) {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Temporary cache cleanup must not hide the import result or its error.
  }
}

export async function prepareServiceDocumentForAnalysis(input: {
  fileUri: string;
  mimeType: ServiceInvoiceSourceMimeType;
  fileSize?: number | null;
}): Promise<PreparedServiceDocument> {
  const info = await FileSystem.getInfoAsync(input.fileUri);
  if (!info.exists) {
    throw new ServiceInvoiceImportError("INVALID_FILE", "The file was not found.");
  }
  const sourceSize = input.fileSize ?? ("size" in info ? info.size : undefined);
  if (
    typeof sourceSize === "number" &&
    sourceSize > MAX_SERVICE_INVOICE_FILE_BYTES
  ) {
    throw new ServiceInvoiceImportError(
      "FILE_TOO_LARGE",
      "The document file is too large.",
    );
  }

  if (input.mimeType !== "image/heic" && input.mimeType !== "image/heif") {
    return {
      fileUri: input.fileUri,
      fileSize: sourceSize,
      mimeType: input.mimeType,
      temporary: false,
    };
  }

  let converted: ImageManipulator.ImageResult;
  try {
    converted = await ImageManipulator.manipulateAsync(input.fileUri, [], {
      compress: SERVICE_DOCUMENT_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
  } catch {
    throw new ServiceInvoiceImportError(
      "INVALID_FILE",
      "The document image could not be converted.",
    );
  }

  try {
    const convertedInfo = await FileSystem.getInfoAsync(converted.uri);
    if (!convertedInfo.exists) {
      throw new ServiceInvoiceImportError(
        "INVALID_FILE",
        "The converted document file was not found.",
      );
    }
    const convertedSize =
      "size" in convertedInfo ? convertedInfo.size : undefined;
    if (
      typeof convertedSize === "number" &&
      convertedSize > MAX_SERVICE_INVOICE_FILE_BYTES
    ) {
      throw new ServiceInvoiceImportError(
        "FILE_TOO_LARGE",
        "The converted document file is too large.",
      );
    }

    return {
      fileUri: converted.uri,
      fileSize: convertedSize,
      mimeType: "image/jpeg",
      temporary: true,
    };
  } catch (error) {
    await deleteTemporaryFile(converted.uri);
    throw error;
  }
}

const requestServiceInvoice = createServiceInvoiceRequester({
  baseUrl: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  fetch: (input, init) => globalThis.fetch(input, init),
  getAccessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    return error ? null : (data.session?.access_token ?? null);
  },
});

export async function analyzeServiceInvoice(input: {
  vehicleId: string;
  fileUri: string;
  mimeType: ServiceInvoiceSourceMimeType;
  fileSize?: number | null;
  signal: AbortSignal;
}) {
  const prepared = await prepareServiceDocumentForAnalysis(input);
  try {
    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(prepared.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      throw new ServiceInvoiceImportError(
        "INVALID_FILE",
        "The document file could not be read.",
      );
    }

    if (base64.length > Math.ceil(MAX_SERVICE_INVOICE_FILE_BYTES / 3) * 4) {
      throw new ServiceInvoiceImportError(
        "FILE_TOO_LARGE",
        "The document file is too large.",
      );
    }

    return await requestServiceInvoice({
      vehicleId: input.vehicleId,
      mimeType: prepared.mimeType,
      base64,
      signal: input.signal,
    });
  } finally {
    if (prepared.temporary) {
      await deleteTemporaryFile(prepared.fileUri);
    }
  }
}
