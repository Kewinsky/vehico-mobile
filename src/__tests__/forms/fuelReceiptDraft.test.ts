import { buildFuelReceiptFormDraft } from "../../forms/fuelReceiptDraft";
import type { FuelReceiptExtraction } from "../../services/ai/fuelReceiptImportRepo";

const EXTRACTION: FuelReceiptExtraction = {
  date: { value: "2026-10-05", status: "recognized" },
  fuelAmount: { value: 40.5, status: "recognized" },
  totalCost: { value: 253.13, status: "recognized" },
  fuelType: { value: "95", status: "recognized" },
  gasStation: { value: "orlen", status: "recognized" },
};

describe("fuelReceiptDraft", () => {
  it("copies receipt values directly to editable form fields", () => {
    expect(buildFuelReceiptFormDraft(EXTRACTION)).toEqual({
      date: "2026-10-05",
      fuelAmount: "40.5",
      fuelCost: "253.13",
      fuelType: "95",
      gasStation: "orlen",
    });
  });
});
