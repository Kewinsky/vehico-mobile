import type { FuelReceiptExtraction } from "../services/ai/fuelReceiptImportRepo";

export type FuelReceiptFormDraft = {
  date: string | null;
  fuelAmount: string | null;
  fuelCost: string | null;
  fuelType: FuelReceiptExtraction["fuelType"]["value"];
  gasStation: FuelReceiptExtraction["gasStation"]["value"];
};

function formatNumber(value: number | null) {
  return value == null ? null : String(value);
}

export function buildFuelReceiptFormDraft(
  extraction: FuelReceiptExtraction,
): FuelReceiptFormDraft {
  return {
    date: extraction.date.value,
    fuelAmount: formatNumber(extraction.fuelAmount.value),
    fuelCost: formatNumber(extraction.totalCost.value),
    fuelType: extraction.fuelType.value,
    gasStation: extraction.gasStation.value,
  };
}
