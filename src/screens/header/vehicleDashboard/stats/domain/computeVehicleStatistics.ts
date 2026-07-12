import type {
  FuelingEntry,
  MileageAudit,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
} from "../../../../../types/domain";
import { SERVICE_CATEGORY_COLORS } from "../../../../../ui/theme/serviceCategoryColors";
import {
  clampNonNeg,
  listMonthKeysInclusive,
  monthKey,
  parseDateLoose,
} from "../../../statistics/domain/math";
import {
  OIL_CHANGE_INTERVAL_DAYS,
  OIL_CHANGE_INTERVAL_KM,
} from "../constants";
import type { PeriodKey } from "../types";
import { getPeriodBounds, isDateInPeriod } from "./periodBounds";

export type FilteredStatisticsData = {
  service: ServiceEntry[];
  fueling: FuelingEntry[];
  mileageAudit: MileageAudit[];
};

export type StatisticsTotals = {
  serviceCost: number;
  fuelCost: number;
  total: number;
  totalDistance: number;
  totalFuel: number;
  avgConsumptionPer100: number;
  costPer100: number;
  avgCostPerLiter: number;
};

export type ExpenseCategoryItem = {
  key: string;
  value: number;
  label: string;
};

export type MonthlyExpensePoint = {
  x: string;
  fuel: number;
  service: number;
  total: number;
};

export type OilLifeState = {
  progressPercent: number;
  progressRatio: number;
  remainingDays: number;
  remainingKm: number | null;
  dueDateLabel: string;
  dueMileage: number | null;
  isOverdue: boolean;
  isDueSoon: boolean;
};

export type VehicleStatisticsSnapshot = {
  filtered: FilteredStatisticsData;
  totals: StatisticsTotals;
  expensesByCategory: ExpenseCategoryItem[];
  monthlyExpensesSeries: { data: MonthlyExpensePoint[] };
  recentServiceEntries: ServiceEntry[];
  lastFueling: FuelingEntry | null;
  fuelIntervals: { avgDays: number };
  avgRefuelAmount: number;
  mileageOverTimeSeries: { x: string; y: number }[];
  lastOilChange: ServiceEntry | null;
  oilIntervals: { avgKm: number; avgMonths: number };
  oilLife: OilLifeState | null;
  daysSinceLastRefuel: number | null;
};

export function filterStatisticsData(
  period: PeriodKey,
  service: ServiceEntry[],
  fueling: FuelingEntry[],
  mileageAudit: MileageAudit[],
): FilteredStatisticsData {
  const bounds = getPeriodBounds(period);

  return {
    service: service.filter((entry) =>
      isDateInPeriod(entry.service_date, period, bounds),
    ),
    fueling: fueling.filter((entry) =>
      isDateInPeriod(entry.date, period, bounds),
    ),
    mileageAudit: mileageAudit.filter((row) =>
      isDateInPeriod(row.reading_date, period, bounds),
    ),
  };
}

function computeTotals(filtered: FilteredStatisticsData): StatisticsTotals {
  const serviceCost = filtered.service.reduce(
    (sum, entry) => sum + Number(entry.cost ?? 0),
    0,
  );
  const fuelCost = filtered.fueling.reduce(
    (sum, entry) => sum + Number(entry.fuel_cost ?? 0),
    0,
  );
  const totalDistance = filtered.fueling.reduce(
    (sum, entry) => sum + Number(entry.distance ?? 0),
    0,
  );
  const totalFuel = filtered.fueling.reduce(
    (sum, entry) => sum + Number(entry.fuel_amount ?? 0),
    0,
  );
  const total = serviceCost + fuelCost;

  return {
    serviceCost,
    fuelCost,
    total,
    totalDistance,
    totalFuel,
    avgConsumptionPer100:
      totalDistance > 0 ? (totalFuel / totalDistance) * 100 : Number.NaN,
    costPer100: totalDistance > 0 ? (total / totalDistance) * 100 : Number.NaN,
    avgCostPerLiter: totalFuel > 0 ? fuelCost / totalFuel : Number.NaN,
  };
}

function computeExpensesByCategory(
  filtered: FilteredStatisticsData,
  labelForCategory: (key: string) => string,
): ExpenseCategoryItem[] {
  const acc: Record<string, number> = {};
  const add = (key: string, amount: number) => {
    acc[key] = (acc[key] ?? 0) + clampNonNeg(amount);
  };

  for (const entry of filtered.fueling) {
    add("fuel", Number(entry.fuel_cost ?? 0));
  }
  for (const entry of filtered.service) {
    const category = (entry.category ?? "other") as ServiceEntryCategory | "other";
    add(category, Number(entry.cost ?? 0));
  }

  return Object.entries(acc)
    .map(([key, value]) => ({ key, value: value ?? 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ ...item, label: labelForCategory(item.key) }));
}

function computeMonthlyExpensesSeries(
  period: PeriodKey,
  filtered: FilteredStatisticsData,
): { data: MonthlyExpensePoint[] } {
  const bounds = getPeriodBounds(period);
  const byMonthFuel: Record<string, number> = {};
  const byMonthService: Record<string, number> = {};

  for (const entry of filtered.fueling) {
    const date = parseDateLoose(entry.date);
    if (!date) continue;
    const key = monthKey(date);
    byMonthFuel[key] =
      (byMonthFuel[key] ?? 0) + clampNonNeg(Number(entry.fuel_cost ?? 0));
  }

  for (const entry of filtered.service) {
    const date = parseDateLoose(entry.service_date);
    if (!date) continue;
    const key = monthKey(date);
    byMonthService[key] =
      (byMonthService[key] ?? 0) + clampNonNeg(Number(entry.cost ?? 0));
  }

  const keysWithData = Array.from(
    new Set([...Object.keys(byMonthFuel), ...Object.keys(byMonthService)]),
  ).sort();

  const monthKeys =
    period === "all"
      ? keysWithData.length > 0
        ? listMonthKeysInclusive(keysWithData[0]!, bounds.currentMonthStr)
        : []
      : listMonthKeysInclusive(bounds.startMonthStr!, bounds.currentMonthStr);

  return {
    data: monthKeys.map((key) => {
      const fuel = byMonthFuel[key] ?? 0;
      const service = byMonthService[key] ?? 0;
      return { x: key, fuel, service, total: fuel + service };
    }),
  };
}

function computeMileageOverTimeSeries(
  period: PeriodKey,
  filtered: FilteredStatisticsData,
): { x: string; y: number }[] {
  const bounds = getPeriodBounds(period);
  const byMonthMax: Record<string, number> = {};

  for (const entry of filtered.service) {
    const mileage = entry.mileage;
    if (mileage == null || !Number.isFinite(mileage) || mileage <= 0) continue;
    const date = parseDateLoose(entry.service_date);
    if (!date) continue;
    const key = monthKey(date);
    byMonthMax[key] = Math.max(byMonthMax[key] ?? 0, mileage);
  }

  for (const row of filtered.mileageAudit) {
    const mileage = row.mileage;
    if (!Number.isFinite(mileage) || mileage <= 0) continue;
    const date = parseDateLoose(row.reading_date);
    if (!date) continue;
    const key = monthKey(date);
    byMonthMax[key] = Math.max(byMonthMax[key] ?? 0, mileage);
  }

  const keysWithData = Object.keys(byMonthMax).sort();
  const monthKeys =
    period === "all"
      ? keysWithData.length > 0
        ? listMonthKeysInclusive(keysWithData[0]!, bounds.currentMonthStr)
        : []
      : listMonthKeysInclusive(bounds.startMonthStr!, bounds.currentMonthStr);

  let runningMax = 0;
  const series: { x: string; y: number }[] = [];
  for (const key of monthKeys) {
    const monthMax = byMonthMax[key];
    if (monthMax != null && monthMax > runningMax) {
      runningMax = monthMax;
    }
    if (runningMax > 0) {
      series.push({ x: key, y: runningMax });
    }
  }

  return series;
}

function computeFuelIntervals(filtered: FilteredStatisticsData): {
  avgDays: number;
} {
  const sorted = [...filtered.fueling].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  if (sorted.length < 2) return { avgDays: Number.NaN };

  const dayDeltas: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const prevDate = parseDateLoose(sorted[index - 1]!.date);
    const currDate = parseDateLoose(sorted[index]!.date);
    if (!prevDate || !currDate) continue;
    const days = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days > 0) dayDeltas.push(days);
  }

  return {
    avgDays:
      dayDeltas.length > 0
        ? dayDeltas.reduce((sum, value) => sum + value, 0) / dayDeltas.length
        : Number.NaN,
  };
}

function computeOilIntervals(service: ServiceEntry[]): {
  avgKm: number;
  avgMonths: number;
} {
  const oilEntries = service
    .filter((entry) => (entry.category ?? "other") === "oil_change")
    .sort(
      (a, b) =>
        new Date(a.service_date).getTime() - new Date(b.service_date).getTime(),
    );

  if (oilEntries.length < 2) {
    return { avgKm: Number.NaN, avgMonths: Number.NaN };
  }

  const kmDeltas: number[] = [];
  const monthDeltas: number[] = [];
  for (let index = 1; index < oilEntries.length; index += 1) {
    const prev = oilEntries[index - 1]!;
    const curr = oilEntries[index]!;
    const prevMileage = prev.mileage ?? null;
    const currMileage = curr.mileage ?? null;
    if (
      prevMileage != null &&
      currMileage != null &&
      currMileage > prevMileage
    ) {
      kmDeltas.push(currMileage - prevMileage);
    }

    const prevDate = parseDateLoose(prev.service_date);
    const currDate = parseDateLoose(curr.service_date);
    if (prevDate && currDate) {
      const months =
        (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
        (currDate.getMonth() - prevDate.getMonth());
      if (months > 0) monthDeltas.push(months);
    }
  }

  return {
    avgKm:
      kmDeltas.length > 0
        ? kmDeltas.reduce((sum, value) => sum + value, 0) / kmDeltas.length
        : Number.NaN,
    avgMonths:
      monthDeltas.length > 0
        ? monthDeltas.reduce((sum, value) => sum + value, 0) /
          monthDeltas.length
        : Number.NaN,
  };
}

function computeOilLife(
  lastOilChange: ServiceEntry | null,
  currentMileage: number | null | undefined,
): OilLifeState | null {
  if (!lastOilChange?.service_date) return null;

  const lastDate = parseDateLoose(lastOilChange.service_date);
  if (!lastDate) return null;

  const today = new Date();
  const dueDate = new Date(lastDate.getTime());
  dueDate.setDate(dueDate.getDate() + OIL_CHANGE_INTERVAL_DAYS);

  const elapsedDays = Math.max(
    0,
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dateRatio = elapsedDays / OIL_CHANGE_INTERVAL_DAYS;

  const lastMileage = lastOilChange.mileage;
  const dueMileage =
    lastMileage != null ? lastMileage + OIL_CHANGE_INTERVAL_KM : null;
  const mileageRatio =
    lastMileage != null && currentMileage != null
      ? Math.max(0, currentMileage - lastMileage) / OIL_CHANGE_INTERVAL_KM
      : Number.NaN;

  const ratios = [dateRatio, mileageRatio].filter((value) =>
    Number.isFinite(value),
  );
  if (ratios.length === 0) return null;

  const rawRatio = Math.max(...ratios);
  const progressRatio = Math.max(0, Math.min(1, rawRatio));
  const progressPercent = Math.round(progressRatio * 100);
  const isOverdue = rawRatio >= 1;
  const isDueSoon = !isOverdue && rawRatio >= 0.85;

  const computedRemainingDays = Math.max(
    0,
    Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const computedRemainingKm =
    dueMileage != null && currentMileage != null
      ? Math.max(0, Math.round(dueMileage - currentMileage))
      : null;

  return {
    progressPercent,
    progressRatio,
    remainingDays: isOverdue ? 0 : computedRemainingDays,
    remainingKm: isOverdue ? 0 : computedRemainingKm,
    dueDateLabel: dueDate.toISOString().slice(0, 10),
    dueMileage,
    isOverdue,
    isDueSoon,
  };
}

function computeDaysSinceLastRefuel(lastFueling: FuelingEntry | null): number | null {
  if (!lastFueling?.date) return null;
  const parsed = parseDateLoose(lastFueling.date);
  if (!parsed) return null;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const fuelDateStart = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  const diff = Math.floor(
    (todayStart.getTime() - fuelDateStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, diff);
}

export function computeVehicleStatistics(input: {
  period: PeriodKey;
  service: ServiceEntry[];
  fueling: FuelingEntry[];
  mileageAudit: MileageAudit[];
  vehicle: Vehicle | null;
  labelForCategory: (key: string) => string;
}): VehicleStatisticsSnapshot {
  const filtered = filterStatisticsData(
    input.period,
    input.service,
    input.fueling,
    input.mileageAudit,
  );
  const totals = computeTotals(filtered);
  const lastFueling =
    filtered.fueling.length === 0
      ? null
      : [...filtered.fueling].sort((a, b) =>
          String(b.date).localeCompare(String(a.date)),
        )[0] ?? null;

  const oilEntries = input.service
    .filter((entry) => (entry.category ?? "other") === "oil_change")
    .sort(
      (a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime(),
    );

  return {
    filtered,
    totals,
    expensesByCategory: computeExpensesByCategory(
      filtered,
      input.labelForCategory,
    ),
    monthlyExpensesSeries: computeMonthlyExpensesSeries(input.period, filtered),
    recentServiceEntries: [...input.service]
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      )
      .slice(0, 3),
    lastFueling,
    fuelIntervals: computeFuelIntervals(filtered),
    avgRefuelAmount: (() => {
      const amounts = filtered.fueling
        .map((entry) => Number(entry.fuel_amount ?? Number.NaN))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (amounts.length === 0) return Number.NaN;
      return amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    })(),
    mileageOverTimeSeries: computeMileageOverTimeSeries(input.period, filtered),
    lastOilChange: oilEntries[0] ?? null,
    oilIntervals: computeOilIntervals(input.service),
    oilLife: computeOilLife(oilEntries[0] ?? null, input.vehicle?.mileage),
    daysSinceLastRefuel: computeDaysSinceLastRefuel(lastFueling),
  };
}

export function buildCategorySeries(
  expensesByCategory: ExpenseCategoryItem[],
  accentColor: string,
) {
  return expensesByCategory.map((item) => ({
    ...item,
    color:
      item.key in SERVICE_CATEGORY_COLORS
        ? SERVICE_CATEGORY_COLORS[
            item.key as keyof typeof SERVICE_CATEGORY_COLORS
          ]
        : accentColor,
  }));
}
