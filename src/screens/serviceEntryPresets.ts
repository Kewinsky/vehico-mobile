import type { ServiceEntryCategory } from "../types/domain";

export type ServiceEntryPreset = {
  titleKey: string;
  category: ServiceEntryCategory;
};

export const SERVICE_ENTRY_PRESETS: ServiceEntryPreset[] = [
  { titleKey: "presets.engineOil", category: "oil_change" },
  { titleKey: "presets.oilFilter", category: "maintenance" },
  { titleKey: "presets.airFilter", category: "maintenance" },
  { titleKey: "presets.cabinFilter", category: "maintenance" },
  { titleKey: "presets.brakesService", category: "repair" },
  { titleKey: "presets.tireRotation", category: "maintenance" },
  { titleKey: "presets.inspection", category: "inspection" },
  { titleKey: "presets.brakeFluid", category: "maintenance" },
];
