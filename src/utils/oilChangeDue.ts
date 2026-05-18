import type { ServiceEntry } from "../types/domain";

export const OIL_CHANGE_INTERVAL_KM = 10_000;
export const OIL_CHANGE_INTERVAL_DAYS = 365;
export const OIL_BANNER_DAYS_BEFORE = 7;
export const OIL_BANNER_KM_BEFORE = 500;

export type OilChangeDueState = {
  showBanner: boolean;
  lastOilChange: ServiceEntry | null;
  isOverdue: boolean;
  remainingDays: number | null;
  remainingKm: number | null;
  dueDateYmd: string | null;
  dueMileage: number | null;
};

function parseYmd(ymd: string): Date | null {
  const slice = ymd.slice(0, 10);
  const d = new Date(`${slice}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function lastOilChangeEntry(entries: ServiceEntry[]): ServiceEntry | null {
  const oilEntries = entries
    .filter((e) => (e.category ?? "other") === "oil_change")
    .sort(
      (a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime(),
    );
  return oilEntries[0] ?? null;
}

export function computeOilChangeDueState(
  serviceEntries: ServiceEntry[],
  currentMileage: number | null,
): OilChangeDueState {
  const lastOilChange = lastOilChangeEntry(serviceEntries);

  if (!lastOilChange?.service_date) {
    return {
      showBanner: true,
      lastOilChange: null,
      isOverdue: false,
      remainingDays: null,
      remainingKm: null,
      dueDateYmd: null,
      dueMileage: null,
    };
  }

  const lastDate = parseYmd(lastOilChange.service_date);
  if (!lastDate) {
    return {
      showBanner: true,
      lastOilChange,
      isOverdue: false,
      remainingDays: null,
      remainingKm: null,
      dueDateYmd: null,
      dueMileage: null,
    };
  }

  const today = new Date();
  const dueDate = new Date(lastDate.getTime());
  dueDate.setDate(dueDate.getDate() + OIL_CHANGE_INTERVAL_DAYS);
  const dueDateYmd = dueDate.toISOString().slice(0, 10);

  const remainingDays = Math.max(
    0,
    Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const lastMileage = lastOilChange.mileage;
  const dueMileage =
    lastMileage != null ? lastMileage + OIL_CHANGE_INTERVAL_KM : null;
  const remainingKm =
    dueMileage != null && currentMileage != null
      ? Math.max(0, Math.round(dueMileage - currentMileage))
      : null;

  const todayYmd = today.toISOString().slice(0, 10);
  const dateOverdue = todayYmd > dueDateYmd;
  const kmOverdue =
    dueMileage != null &&
    currentMileage != null &&
    currentMileage >= dueMileage;
  const isOverdue = dateOverdue || kmOverdue;

  const dateDueSoon =
    !dateOverdue && remainingDays <= OIL_BANNER_DAYS_BEFORE;
  const kmDueSoon =
    !kmOverdue &&
    remainingKm != null &&
    remainingKm <= OIL_BANNER_KM_BEFORE;
  const showBanner = isOverdue || dateDueSoon || kmDueSoon;

  return {
    showBanner,
    lastOilChange,
    isOverdue,
    remainingDays,
    remainingKm,
    dueDateYmd,
    dueMileage,
  };
}
