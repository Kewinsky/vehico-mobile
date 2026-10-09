import * as FileSystem from "expo-file-system/legacy";

import {
  isAiImportFieldStatus,
  isAiImportFieldValuePresenceValid,
  type AiImportFieldStatus,
} from "../../../shared/ai/importContract";
import { ENV } from "../../config/env";
import type { FuelGrade, GasStation } from "../../types/domain";
import { supabase } from "../supabase/client";
import {
  MAX_SERVICE_INVOICE_FILE_BYTES,
  ServiceInvoiceImportError,
  prepareServiceDocumentForAnalysis,
  resolveServiceInvoiceMimeType,
  type ServiceInvoiceSourceMimeType,
} from "./serviceInvoiceImportRepo";

export const MAX_FUEL_RECEIPT_FILE_BYTES = MAX_SERVICE_INVOICE_FILE_BYTES;

export type FuelReceiptMimeType = "image/jpeg" | "image/png";
export type FuelReceiptSourceMimeType = Exclude<
  ServiceInvoiceSourceMimeType,
  "application/pdf"
>;
export type FuelReceiptFieldStatus = AiImportFieldStatus;
export type FuelReceiptField<T> = {
  value: T | null;
  status: FuelReceiptFieldStatus;
};
export type FuelReceiptExtraction = {
  date: FuelReceiptField<string>;
  fuelAmount: FuelReceiptField<number>;
  totalCost: FuelReceiptField<number>;
  fuelType: FuelReceiptField<FuelGrade>;
  gasStation: FuelReceiptField<GasStation>;
};

export type FuelReceiptImportErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED"
  | "MODEL_TIMEOUT"
  | "INVALID_MODEL_RESPONSE"
  | "MODEL_REQUEST_FAILED"
  | "FEATURE_DISABLED"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED";

export class FuelReceiptImportError extends Error {
  constructor(
    public readonly code: FuelReceiptImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FuelReceiptImportError";
  }
}

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FuelReceiptFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<FetchResponse>;

type FuelReceiptDependencies = {
  baseUrl: string;
  anonKey: string;
  fetch: FuelReceiptFetch;
  getAccessToken: () => Promise<string | null>;
};

type RequestInput = {
  vehicleId: string;
  mimeType: FuelReceiptMimeType;
  base64: string;
  signal: AbortSignal;
};

const FUEL_GRADES: readonly FuelGrade[] = ["95", "98", "100", "on", "lpg"];
const GAS_STATIONS: readonly GasStation[] = [
  "orlen",
  "bp",
  "shell",
  "circle_k",
  "mol",
  "moya",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStatus(value: unknown): value is FuelReceiptFieldStatus {
  return isAiImportFieldStatus(value);
}

function parseField<T>(
  value: unknown,
  isValue: (candidate: unknown) => candidate is T,
): FuelReceiptField<T> | null {
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

function parseExtraction(value: unknown): FuelReceiptExtraction | null {
  if (!isRecord(value)) return null;
  const date = parseField(value.date, (item): item is string =>
    typeof item === "string",
  );
  const numberField = (field: unknown) =>
    parseField(
      field,
      (item): item is number =>
        typeof item === "number" && Number.isFinite(item) && item > 0,
    );
  const fuelAmount = numberField(value.fuelAmount);
  const totalCost = numberField(value.totalCost);
  const fuelType = parseField(value.fuelType, (item): item is FuelGrade =>
    FUEL_GRADES.includes(item as FuelGrade),
  );
  const gasStation = parseField(value.gasStation, (item): item is GasStation =>
    GAS_STATIONS.includes(item as GasStation),
  );
  if (
    !date ||
    !fuelAmount ||
    !totalCost ||
    !fuelType ||
    !gasStation
  ) {
    return null;
  }
  return {
    date,
    fuelAmount,
    totalCost,
    fuelType,
    gasStation,
  };
}

function serverErrorCode(code: string): FuelReceiptImportErrorCode {
  if (code === "FILE_TOO_LARGE") return "FILE_TOO_LARGE";
  if (code === "UNSUPPORTED_FILE") return "INVALID_FILE";
  if (code === "MODEL_TIMEOUT") return "MODEL_TIMEOUT";
  if (code === "INVALID_MODEL_RESPONSE") return "INVALID_MODEL_RESPONSE";
  if (code === "MODEL_REQUEST_FAILED") return "MODEL_REQUEST_FAILED";
  if (code === "FEATURE_DISABLED") return "FEATURE_DISABLED";
  if (code === "RATE_LIMITED") return "RATE_LIMITED";
  if (code === "BUDGET_EXCEEDED") return "BUDGET_EXCEEDED";
  return "REQUEST_FAILED";
}

async function responseError(response: FetchResponse) {
  try {
    const payload = await response.json();
    if (
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.code === "string" &&
      typeof payload.error.message === "string"
    ) {
      return new FuelReceiptImportError(
        serverErrorCode(payload.error.code),
        payload.error.message,
      );
    }
  } catch {
    // Use the stable fallback below when the server body is unreadable.
  }
  return new FuelReceiptImportError(
    "REQUEST_FAILED",
    `Receipt import failed with status ${response.status}.`,
  );
}

export function createFuelReceiptRequester({
  baseUrl,
  anonKey,
  fetch,
  getAccessToken,
}: FuelReceiptDependencies) {
  return async function requestFuelReceipt({
    vehicleId,
    mimeType,
    base64,
    signal,
  }: RequestInput): Promise<FuelReceiptExtraction> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new FuelReceiptImportError(
        "AUTH_REQUIRED",
        "An authenticated session is required.",
      );
    }

    let response: FetchResponse;
    try {
      response = await fetch(`${baseUrl}/functions/v1/fuel-receipt-import`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicleId, mimeType, base64 }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new FuelReceiptImportError(
        "NETWORK_ERROR",
        "Could not connect to receipt analysis.",
      );
    }
    if (!response.ok) throw await responseError(response);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new FuelReceiptImportError(
        "INVALID_RESPONSE",
        "Receipt analysis returned an invalid response.",
      );
    }
    const extraction = parseExtraction(body);
    if (!extraction) {
      throw new FuelReceiptImportError(
        "INVALID_RESPONSE",
        "Receipt analysis returned an invalid response.",
      );
    }
    return extraction;
  };
}

export function resolveFuelReceiptMimeType(
  mimeType: string | null | undefined,
  fileName: string,
): FuelReceiptSourceMimeType | null {
  const resolved = resolveServiceInvoiceMimeType(mimeType, fileName);
  return resolved === "application/pdf" ? null : resolved;
}

const requestFuelReceipt = createFuelReceiptRequester({
  baseUrl: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  fetch: (input, init) => globalThis.fetch(input, init),
  getAccessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    return error ? null : (data.session?.access_token ?? null);
  },
});

export async function analyzeFuelReceipt(input: {
  vehicleId: string;
  fileUri: string;
  mimeType: FuelReceiptSourceMimeType;
  fileSize?: number | null;
  signal: AbortSignal;
}) {
  let prepared: Awaited<ReturnType<typeof prepareServiceDocumentForAnalysis>>;
  try {
    prepared = await prepareServiceDocumentForAnalysis(input);
  } catch (error) {
    if (error instanceof ServiceInvoiceImportError) {
      throw new FuelReceiptImportError(
        error.code === "FILE_TOO_LARGE" ? "FILE_TOO_LARGE" : "INVALID_FILE",
        error.message,
      );
    }
    throw error;
  }

  try {
    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(prepared.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      throw new FuelReceiptImportError(
        "INVALID_FILE",
        "The receipt image could not be read.",
      );
    }
    if (base64.length > Math.ceil(MAX_FUEL_RECEIPT_FILE_BYTES / 3) * 4) {
      throw new FuelReceiptImportError(
        "FILE_TOO_LARGE",
        "The receipt image is too large.",
      );
    }
    if (prepared.mimeType === "application/pdf") {
      throw new FuelReceiptImportError(
        "INVALID_FILE",
        "PDF receipts are not supported.",
      );
    }
    return await requestFuelReceipt({
      vehicleId: input.vehicleId,
      mimeType: prepared.mimeType,
      base64,
      signal: input.signal,
    });
  } finally {
    if (prepared.temporary) {
      try {
        await FileSystem.deleteAsync(prepared.fileUri, { idempotent: true });
      } catch {
        // Temporary cache cleanup must not hide the import result or its error.
      }
    }
  }
}
