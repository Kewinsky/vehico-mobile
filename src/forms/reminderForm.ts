import type { ReminderRecurrenceUnit, ReminderStatus } from "../types/domain";
import {
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDate,
  parseNonNegative,
  parsePositive,
} from "../utils/validation";

export const RECURRENCE_UNITS: {
  value: ReminderRecurrenceUnit;
  max: number;
}[] = [
  { value: "days", max: 31 },
  { value: "weeks", max: 4 },
  { value: "months", max: 12 },
  { value: "years", max: 10 },
];

export type ReminderFormState = {
  status: ReminderStatus;
  title: string;
  notes: string;
  dateEnabled: boolean;
  dueDate: string;
  daysBefore: string;
  dateRepeats: boolean;
  recurrenceValue: string;
  recurrenceUnit: ReminderRecurrenceUnit;
  mileageEnabled: boolean;
  dueMileage: string;
  mileageRepeats: boolean;
  recurrenceKm: string;
};

function isRecurrenceValueValid(
  recurrenceValue: string,
  recurrenceUnit: ReminderRecurrenceUnit,
): boolean {
  const max =
    RECURRENCE_UNITS.find((unit) => unit.value === recurrenceUnit)?.max ?? 12;
  const value = parseInt(recurrenceValue, 10);
  return Number.isInteger(value) && value >= 1 && value <= max;
}

export function canSaveReminder(form: ReminderFormState): boolean {
  if (!form.title.trim()) return false;
  if (form.dateEnabled && !isValidDate(form.dueDate)) return false;
  if (form.mileageEnabled && !isPositiveNumber(form.dueMileage)) return false;
  if (!form.dateEnabled && !form.mileageEnabled) return false;
  if (form.dateRepeats && !isRecurrenceValueValid(form.recurrenceValue, form.recurrenceUnit)) {
    return false;
  }
  if (form.mileageRepeats && !isPositiveNumber(form.recurrenceKm)) return false;
  if (form.daysBefore.trim() && !isNonNegativeNumber(form.daysBefore)) return false;
  return true;
}

export function reminderFieldErrors(form: ReminderFormState) {
  return {
    title: !form.title.trim(),
    reminderType: !form.dateEnabled && !form.mileageEnabled,
    dueDate: form.dateEnabled && !isValidDate(form.dueDate),
    daysBefore:
      form.daysBefore.trim().length > 0 &&
      !isNonNegativeNumber(form.daysBefore),
    recurrence:
      form.dateRepeats &&
      !isRecurrenceValueValid(form.recurrenceValue, form.recurrenceUnit),
    dueMileage: form.mileageEnabled && !isPositiveNumber(form.dueMileage),
    recurrenceKm: form.mileageRepeats && !isPositiveNumber(form.recurrenceKm),
  };
}

export function buildReminderPayload(vehicleId: string, form: ReminderFormState) {
  if (!canSaveReminder(form)) {
    throw new Error("Invalid reminder form");
  }

  const dueMileage = form.mileageEnabled ? parsePositive(form.dueMileage) : null;
  const recurrenceKm = form.mileageRepeats ? parsePositive(form.recurrenceKm) : null;

  return {
    vehicle_id: vehicleId,
    due_date: form.dateEnabled ? form.dueDate.trim() : null,
    due_mileage: dueMileage,
    days_before:
      form.dateEnabled && form.daysBefore.trim()
        ? parseNonNegative(form.daysBefore)
        : null,
    title: form.title.trim(),
    notes: form.notes.trim().length ? form.notes.trim() : null,
    status: form.status,
    channel_email: true,
    channel_push: true,
    enabled: true,
    recurrence_interval_value: form.dateRepeats
      ? parseInt(form.recurrenceValue, 10) || null
      : null,
    recurrence_interval_unit: form.dateRepeats ? form.recurrenceUnit : null,
    recurrence_interval_km: recurrenceKm,
    recurrence_anchor_mileage:
      form.mileageEnabled &&
      form.mileageRepeats &&
      dueMileage != null &&
      recurrenceKm != null
        ? dueMileage - recurrenceKm
        : null,
  };
}
