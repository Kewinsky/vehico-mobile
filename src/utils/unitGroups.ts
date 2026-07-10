import type { UserSettings } from "../core/providers/UserSettingsProvider";

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
