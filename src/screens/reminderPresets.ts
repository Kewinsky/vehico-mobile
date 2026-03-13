import type { ReminderRecurrenceUnit } from "../types/domain";

export type ReminderPreset = {
  /** i18n key for title (reminderForm.presets.xxx) */
  titleKey: string;
  /** i18n key for notes (optional) */
  notesKey?: string;
  dateEnabled: boolean;
  daysBefore: number;
  dateRepeats: boolean;
  recurrenceValue?: number;
  recurrenceUnit?: ReminderRecurrenceUnit;
  mileageEnabled: boolean;
  dueMileage?: number;
  mileageRepeats: boolean;
  recurrenceKm?: number;
};

const TODAY = new Date();
function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}
function addYears(d: Date, years: number): Date {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + years);
  return out;
}
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  {
    titleKey: "presets.engineOil",
    notesKey: "presets.engineOilNotes",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 12,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 10000,
    mileageRepeats: true,
    recurrenceKm: 10000,
  },
  {
    titleKey: "presets.oilFilter",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 12,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 10000,
    mileageRepeats: true,
    recurrenceKm: 10000,
  },
  {
    titleKey: "presets.airFilter",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 24,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 30000,
    mileageRepeats: true,
    recurrenceKm: 30000,
  },
  {
    titleKey: "presets.cabinFilter",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 12,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 15000,
    mileageRepeats: true,
    recurrenceKm: 15000,
  },
  {
    titleKey: "presets.brakesInspection",
    dateEnabled: true,
    daysBefore: 7,
    dateRepeats: true,
    recurrenceValue: 12,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 10000,
    mileageRepeats: true,
    recurrenceKm: 10000,
  },
  {
    titleKey: "presets.brakesService",
    dateEnabled: true,
    daysBefore: 7,
    dateRepeats: true,
    recurrenceValue: 24,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 30000,
    mileageRepeats: true,
    recurrenceKm: 30000,
  },
  {
    titleKey: "presets.brakeFluid",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 24,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 40000,
    mileageRepeats: true,
    recurrenceKm: 40000,
  },
  {
    titleKey: "presets.tireRotation",
    dateEnabled: true,
    daysBefore: 7,
    dateRepeats: true,
    recurrenceValue: 12,
    recurrenceUnit: "months",
    mileageEnabled: true,
    dueMileage: 10000,
    mileageRepeats: true,
    recurrenceKm: 10000,
  },
  {
    titleKey: "presets.transmissionFluid",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 4,
    recurrenceUnit: "years",
    mileageEnabled: true,
    dueMileage: 60000,
    mileageRepeats: true,
    recurrenceKm: 60000,
  },
  {
    titleKey: "presets.coolant",
    notesKey: "presets.coolantNotes",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 4,
    recurrenceUnit: "years",
    mileageEnabled: true,
    dueMileage: 80000,
    mileageRepeats: true,
    recurrenceKm: 80000,
  },
  {
    titleKey: "presets.sparkPlugs",
    dateEnabled: true,
    daysBefore: 30,
    dateRepeats: true,
    recurrenceValue: 5,
    recurrenceUnit: "years",
    mileageEnabled: true,
    dueMileage: 80000,
    mileageRepeats: true,
    recurrenceKm: 80000,
  },
  {
    titleKey: "presets.timingBelt",
    notesKey: "presets.timingBeltNotes",
    dateEnabled: true,
    daysBefore: 30,
    dateRepeats: true,
    recurrenceValue: 6,
    recurrenceUnit: "years",
    mileageEnabled: true,
    dueMileage: 100000,
    mileageRepeats: true,
    recurrenceKm: 100000,
  },
  {
    titleKey: "presets.battery",
    dateEnabled: true,
    daysBefore: 30,
    dateRepeats: true,
    recurrenceValue: 4,
    recurrenceUnit: "years",
    mileageEnabled: false,
    mileageRepeats: false,
  },
  {
    titleKey: "presets.wiperBlades",
    dateEnabled: true,
    daysBefore: 7,
    dateRepeats: true,
    recurrenceValue: 1,
    recurrenceUnit: "years",
    mileageEnabled: false,
    mileageRepeats: false,
  },
  {
    titleKey: "presets.inspection",
    dateEnabled: true,
    daysBefore: 14,
    dateRepeats: true,
    recurrenceValue: 1,
    recurrenceUnit: "years",
    mileageEnabled: false,
    mileageRepeats: false,
  },
];

/** Default due date for a preset (e.g. today + 1 month for short intervals) */
export function getPresetDueDate(preset: ReminderPreset): string {
  if (preset.recurrenceUnit === "months" && preset.recurrenceValue != null) {
    return ymd(addMonths(TODAY, Math.min(preset.recurrenceValue, 1)));
  }
  if (preset.recurrenceUnit === "years" && preset.recurrenceValue != null) {
    return ymd(addYears(TODAY, Math.min(preset.recurrenceValue, 1)));
  }
  return ymd(TODAY);
}
