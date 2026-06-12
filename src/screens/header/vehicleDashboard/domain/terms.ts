import type { Reminder } from "../../../../types/domain";
import { daysSinceYmd } from "../../../../utils/formatRelativeTimePast";
import { formatShortDisplayDate } from "../../../../utils/dateFormatting";

const MILEAGE_STALE_MIN_DAYS = 90;
export const FORMALITY_CALLOUT_DAYS_BEFORE = 7;

export function shouldShowFormalityCallout(
  daysUntil: number | null,
  daysBefore: number = FORMALITY_CALLOUT_DAYS_BEFORE,
): boolean {
  return daysUntil != null && daysUntil <= daysBefore;
}

export function isReminderOverdue(
  reminder: Reminder,
  currentMileage: number | null | undefined,
): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const dateOverdue =
    reminder.due_date != null && String(reminder.due_date).slice(0, 10) < today;
  const mileageOverdue =
    reminder.due_mileage != null &&
    currentMileage != null &&
    currentMileage >= reminder.due_mileage;
  return dateOverdue || mileageOverdue;
}

function parseYmd(dateYmd: string): Date | null {
  if (!dateYmd) return null;
  const date = new Date(`${dateYmd}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function quickMetricsWindowYmdBounds(): {
  fromYmd: string;
  toYmd: string;
} {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { fromYmd: localYmd(start), toYmd: localYmd(end) };
}

function formatTermsDate(
  dateYmd: string | null | undefined,
  language: string,
): string {
  if (!dateYmd) return "–";
  const date = parseYmd(dateYmd);
  if (!date) return "–";
  return formatShortDisplayDate(date, language);
}

export function getDaysUntilDate(
  dateYmd: string | null | undefined,
): number | null {
  if (!dateYmd) return null;
  const date = parseYmd(dateYmd);
  if (!date) return null;
  const now = new Date();
  const todayMidday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  );
  return Math.ceil(
    (date.getTime() - todayMidday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function formatTermsValue(
  dateYmd: string | null | undefined,
  daysUntil: number | null,
  translate: (key: string, options?: Record<string, unknown>) => string,
  language: string,
): string {
  if (!dateYmd) return "–";
  if (daysUntil == null) return formatTermsDate(dateYmd, language);
  if (daysUntil < 0) return translate("dashboard.stats.statusOverdue");
  if (daysUntil === 0) return translate("dashboard.stats.dueToday");
  if (daysUntil <= 30)
    return translate("dashboard.stats.dueInDaysShort", { days: daysUntil });
  return formatTermsDate(dateYmd, language);
}

export function getMileageStaleYmd(
  mileage: number | null | undefined,
  mileageUpdatedAt: string | null | undefined,
): string | null {
  if (mileage == null) return null;
  if (mileageUpdatedAt == null || mileageUpdatedAt === "") return null;
  if (daysSinceYmd(mileageUpdatedAt) < MILEAGE_STALE_MIN_DAYS) return null;
  return mileageUpdatedAt;
}
