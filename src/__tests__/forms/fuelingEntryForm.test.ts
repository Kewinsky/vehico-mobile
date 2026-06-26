import {
  buildFuelingEntryPayload,
  canSaveFuelingEntry,
  fuelingEntryFieldErrors,
} from "../../forms/fuelingEntryForm";

describe("fuelingEntryForm", () => {
  const validForm = {
    date: "2025-06-26",
    distance: "120,50",
    fuelAmount: "45,5",
    fuelCost: "320,99",
    fuelType: "95" as const,
    gasStation: "orlen" as const,
  };

  it("accepts a valid form", () => {
    expect(canSaveFuelingEntry(validForm)).toBe(true);
    expect(fuelingEntryFieldErrors(validForm)).toEqual({
      date: false,
      distance: false,
      fuelAmount: false,
      fuelCost: false,
    });
  });

  it("allows empty optional distance", () => {
    expect(canSaveFuelingEntry({ ...validForm, distance: "" })).toBe(true);
    expect(fuelingEntryFieldErrors({ ...validForm, distance: "" }).distance).toBe(
      false,
    );
  });

  it("flags too many decimal places", () => {
    const form = { ...validForm, fuelCost: "10,123" };
    expect(canSaveFuelingEntry(form)).toBe(false);
    expect(fuelingEntryFieldErrors(form).fuelCost).toBe(true);
  });

  it("flags invalid date and empty required amounts", () => {
    expect(canSaveFuelingEntry({ ...validForm, date: "bad" })).toBe(false);
    expect(canSaveFuelingEntry({ ...validForm, fuelAmount: "" })).toBe(false);
  });

  it("builds API payload from valid form", () => {
    expect(buildFuelingEntryPayload("vehicle-1", validForm)).toEqual({
      vehicle_id: "vehicle-1",
      date: "2025-06-26",
      distance: 120.5,
      fuel_amount: 45.5,
      fuel_cost: 320.99,
      fuel_type: "95",
      gas_station: "orlen",
    });
  });
});
