import type { ServiceEntryCategory, VehicleType } from "../types/domain";

export const VEHICLE_TYPES: readonly VehicleType[] = [
  "car",
  "motorcycle",
  "van",
  "truck",
  "camper",
  "trailer",
  "other",
] as const;

export type ServiceHistoryCategoryFilter =
  | "all"
  | "modifications"
  | ServiceEntryCategory;

export type VehicleFormalityDateField =
  | "insurance_valid_until"
  | "ac_valid_until"
  | "inspection_valid_until";

export function isMotorcycleVehicleType(type: VehicleType): boolean {
  return type === "motorcycle";
}

export function getVehicleTypeMciIcon(type: VehicleType): string {
  switch (type) {
    case "car":
      return "car-outline";
    case "motorcycle":
      return "motorbike";
    case "van":
      return "van-utility";
    case "truck":
      return "truck-outline";
    case "camper":
      return "caravan";
    case "trailer":
      return "trailer";
    case "other":
      return "car-multiple";
    default:
      return "car-outline";
  }
}

export function matchesServiceCategoryFilter(
  category: ServiceEntryCategory,
  filter: ServiceHistoryCategoryFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "modifications") return category === "upgrade";
  return category === filter;
}

/** Service category `upgrade` is labeled „Modyfikacje” in the app. */
export function isModificationCategory(
  category: ServiceEntryCategory | null | undefined,
): boolean {
  return category === "upgrade";
}
