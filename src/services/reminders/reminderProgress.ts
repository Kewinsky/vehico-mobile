import type { Reminder } from "../../types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getReminderProgressPercent(
  reminder: Reminder,
  currentMileage: number | null | undefined,
  now: Date,
): number {
  let dateProgress: number | null = null;
  let dateRemainingFraction: number | null = null;
  if (reminder.due_date) {
    const due = new Date(reminder.due_date);
    const created = reminder.created_at ? new Date(reminder.created_at) : null;
    const hasValidCreated = created != null && !Number.isNaN(created.getTime());
    const createdMs = hasValidCreated ? created.getTime() : now.getTime();
    const startMs = createdMs < due.getTime() ? createdMs : now.getTime();
    const totalMs = Math.max(1, due.getTime() - startMs);
    const remainingMs = due.getTime() - now.getTime();
    const coveredMs = totalMs - Math.max(0, remainingMs);
    dateProgress = clamp(coveredMs / totalMs, 0, 1);
    dateRemainingFraction = clamp(Math.max(0, remainingMs) / totalMs, 0, 1);
  }

  let mileageProgress: number | null = null;
  let mileageRemainingFraction: number | null = null;
  if (reminder.due_mileage != null && currentMileage != null) {
    const startMileage = reminder.recurrence_anchor_mileage ?? 0;
    const totalDistance = Math.max(1, reminder.due_mileage - startMileage);
    const coveredDistance = currentMileage - startMileage;
    mileageProgress = clamp(coveredDistance / totalDistance, 0, 1);
    const mileageRemaining = Math.max(0, reminder.due_mileage - currentMileage);
    mileageRemainingFraction = clamp(mileageRemaining / totalDistance, 0, 1);
  }

  const useDateForProgress =
    dateRemainingFraction != null &&
    (mileageRemainingFraction == null ||
      dateRemainingFraction <= mileageRemainingFraction);
  const progress = useDateForProgress
    ? (dateProgress ?? mileageProgress ?? 0)
    : (mileageProgress ?? dateProgress ?? 0);

  return Math.round(clamp(progress, 0, 1) * 100);
}
