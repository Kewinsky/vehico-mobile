import type { UserSettings } from "../app/providers/UserSettingsProvider";

export type UnitGroupId = "metric" | "european" | "uk" | "imperial";

export type UnitGroupDefinition = {
  id: UnitGroupId;
  distanceUnit: UserSettings["distanceUnit"];
  fuelUnit: UserSettings["fuelUnit"];
  distanceLabel: string;
  fuelShort: string;
  consumptionLabel: string;
};

/** Display-only presets; stored values are never converted. */
export const UNIT_GROUPS: readonly UnitGroupDefinition[] = [
  {
    id: "metric",
    distanceUnit: "km",
    fuelUnit: "liters",
    distanceLabel: "km",
    fuelShort: "L",
    consumptionLabel: "km/L",
  },
  {
    id: "european",
    distanceUnit: "km",
    fuelUnit: "liters",
    distanceLabel: "km",
    fuelShort: "L",
    consumptionLabel: "L/100km",
  },
  {
    id: "uk",
    distanceUnit: "miles",
    fuelUnit: "liters",
    distanceLabel: "mi",
    fuelShort: "L",
    consumptionLabel: "mpg",
  },
  {
    id: "imperial",
    distanceUnit: "miles",
    fuelUnit: "gallons",
    distanceLabel: "mi",
    fuelShort: "gal",
    consumptionLabel: "mpg",
  },
] as const;

export function unitGroupFromLegacySettings(
  distanceUnit: UserSettings["distanceUnit"],
  fuelUnit: UserSettings["fuelUnit"],
): UnitGroupId {
  if (distanceUnit === "miles" && fuelUnit === "gallons") return "imperial";
  if (distanceUnit === "miles") return "uk";
  if (fuelUnit === "gallons") return "imperial";
  return "european";
}

export function resolveUnitGroupId(
  settings: UserSettings | null | undefined,
): UnitGroupId {
  if (settings?.unitGroup) return settings.unitGroup;
  return unitGroupFromLegacySettings(
    settings?.distanceUnit ?? "km",
    settings?.fuelUnit ?? "liters",
  );
}

export function getUnitGroupDefinition(
  groupId: UnitGroupId,
): UnitGroupDefinition {
  return (
    UNIT_GROUPS.find((g) => g.id === groupId) ??
    UNIT_GROUPS.find((g) => g.id === "european")!
  );
}

export type UnitDisplay = {
  unitGroup: UnitGroupId;
  distanceUnit: UserSettings["distanceUnit"];
  fuelUnit: UserSettings["fuelUnit"];
  distanceUnitLabel: string;
  fuelUnitShort: string;
  consumptionUnitLine: string;
};

export function getUnitDisplay(
  settings: UserSettings | null | undefined,
): UnitDisplay {
  const unitGroup = resolveUnitGroupId(settings);
  const group = getUnitGroupDefinition(unitGroup);
  return {
    unitGroup,
    distanceUnit: group.distanceUnit,
    fuelUnit: group.fuelUnit,
    distanceUnitLabel: group.distanceLabel,
    fuelUnitShort: group.fuelShort,
    consumptionUnitLine: group.consumptionLabel,
  };
}

/**
 * Per-fill consumption from fuel amount + trip distance.
 * Returns null when either value is missing or not positive.
 */
export function computeTripConsumption(input: {
  unitGroup: UnitGroupId;
  fuelAmount: number;
  distance: number | null | undefined;
}): number | null {
  const fuel = Number(input.fuelAmount);
  const distance = Number(input.distance);
  if (!(fuel > 0) || !(distance > 0) || !Number.isFinite(fuel) || !Number.isFinite(distance)) {
    return null;
  }
  switch (input.unitGroup) {
    case "european":
      return (fuel / distance) * 100;
    case "metric":
    case "uk":
    case "imperial":
      return distance / fuel;
    default:
      return (fuel / distance) * 100;
  }
}

export function settingsPatchForUnitGroup(
  groupId: UnitGroupId,
): Pick<UserSettings, "unitGroup" | "distanceUnit" | "fuelUnit"> {
  const group = getUnitGroupDefinition(groupId);
  return {
    unitGroup: groupId,
    distanceUnit: group.distanceUnit,
    fuelUnit: group.fuelUnit,
  };
}
