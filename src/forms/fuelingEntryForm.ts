import type { FuelGrade, GasStation } from "../types/domain";
import { isPositiveNumber, isValidDate, parsePositive } from "../utils/validation";

export const FUEL_TYPE_OPTIONS = [
  "95",
  "98",
  "100",
  "on",
  "lpg",
] as const satisfies readonly FuelGrade[];

export const GAS_STATION_OPTIONS = [
  "orlen",
  "bp",
  "shell",
  "circle_k",
  "mol",
  "moya",
  "other",
] as const satisfies readonly GasStation[];

export type FuelingEntryFormState = {
  date: string;
  distance: string;
  fuelAmount: string;
  fuelCost: string;
  fuelType: FuelGrade | null;
  gasStation: GasStation | null;
};

export function canSaveFuelingEntry(form: FuelingEntryFormState): boolean {
  return (
    isValidDate(form.date) &&
    isPositiveNumber(form.fuelAmount) &&
    isPositiveNumber(form.fuelCost) &&
    (form.distance.trim() === "" || isPositiveNumber(form.distance))
  );
}

export function fuelingEntryFieldErrors(form: FuelingEntryFormState) {
  return {
    date: !isValidDate(form.date),
    distance:
      form.distance.trim() !== "" && !isPositiveNumber(form.distance),
    fuelAmount: !isPositiveNumber(form.fuelAmount),
    fuelCost: !isPositiveNumber(form.fuelCost),
  };
}

export function buildFuelingEntryPayload(
  vehicleId: string,
  form: FuelingEntryFormState,
) {
  if (!canSaveFuelingEntry(form)) {
    throw new Error("Invalid fueling entry form");
  }

  return {
    vehicle_id: vehicleId,
    date: form.date.trim(),
    distance: form.distance.trim() ? parsePositive(form.distance) : null,
    fuel_amount: parsePositive(form.fuelAmount)!,
    fuel_cost: parsePositive(form.fuelCost)!,
    fuel_type: form.fuelType,
    gas_station: form.gasStation,
  };
}
