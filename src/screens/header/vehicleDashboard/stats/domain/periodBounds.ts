import type { PeriodKey } from "../types";

export type PeriodBounds = {
  todayStr: string;
  currentMonthStr: string;
  startMonthStr: string | null;
};

function monthsBackForPeriod(period: PeriodKey): number {
  switch (period) {
    case "1m":
      return 0;
    case "3m":
      return 2;
    case "6m":
      return 5;
    case "1y":
      return 11;
    case "all":
      return 0;
  }
}

export function getPeriodBounds(period: PeriodKey): PeriodBounds {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  if (period === "all") {
    return { todayStr, currentMonthStr, startMonthStr: null };
  }

  const monthsBack = monthsBackForPeriod(period);
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth() - monthsBack,
    1,
  );
  const startMonthStr = `${startDate.getFullYear()}-${String(
    startDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  return { todayStr, currentMonthStr, startMonthStr };
}

export function isDateInPeriod(
  dateStr: string,
  period: PeriodKey,
  bounds: PeriodBounds,
): boolean {
  const normalizedDate = dateStr.slice(0, 10);
  if (normalizedDate > bounds.todayStr) return false;
  if (period === "all") return true;

  const entryMonthStr = normalizedDate.slice(0, 7);
  return (
    entryMonthStr >= bounds.startMonthStr! &&
    entryMonthStr <= bounds.currentMonthStr
  );
}
