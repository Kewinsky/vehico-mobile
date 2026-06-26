import type { ServiceEntryCategory } from "../types/domain";
import {
  isNonNegativeNumber,
  isValidDate,
  parseNonNegative,
} from "../utils/validation";

export const SERVICE_ENTRY_CATEGORY_OPTIONS = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_change",
  "other",
] as const satisfies readonly ServiceEntryCategory[];

export type ServiceEntryRowState = {
  title: string;
  cost: string;
};

export type ServiceEntryFormMode = "single" | "multi";

export type ServiceEntryFormState = {
  mode: ServiceEntryFormMode;
  serviceDate: string;
  mileage: string;
  category: ServiceEntryCategory | null;
  entries: ServiceEntryRowState[];
  description: string;
  workshopId: string | null;
  workshopSnapshot: string | null;
};

export function canSaveServiceEntry(form: ServiceEntryFormState): boolean {
  return (
    isValidDate(form.serviceDate) &&
    form.category != null &&
    form.entries.every((entry) => entry.title.trim().length > 0) &&
    form.entries.every((entry) => isNonNegativeNumber(entry.cost)) &&
    isNonNegativeNumber(form.mileage)
  );
}

export function serviceEntryFieldErrors(form: ServiceEntryFormState) {
  return {
    serviceDate: !isValidDate(form.serviceDate),
    category: form.category == null,
    mileage: !isNonNegativeNumber(form.mileage),
    entryTitles: form.entries.map((entry) => !entry.title.trim()),
    entryCosts: form.entries.map((entry) => !isNonNegativeNumber(entry.cost)),
  };
}

export function buildServiceEntryBasePayload(
  vehicleId: string,
  form: ServiceEntryFormState,
  workshopName: string | null,
) {
  if (!canSaveServiceEntry(form)) {
    throw new Error("Invalid service entry form");
  }

  return {
    vehicle_id: vehicleId,
    service_date: form.serviceDate.trim(),
    mileage: form.mileage.trim().length ? parseNonNegative(form.mileage) : null,
    category: form.category!,
    workshop_id: form.workshopId || null,
    workshop_snapshot: workshopName,
  };
}

export function buildServiceEntryRowPayload(
  entry: ServiceEntryRowState,
  description: string,
) {
  return {
    title: entry.title.trim(),
    description: description.trim(),
    cost: entry.cost.trim().length ? parseNonNegative(entry.cost) : null,
  };
}
