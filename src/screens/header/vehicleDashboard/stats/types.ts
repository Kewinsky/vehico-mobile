import type { TFunction, i18n as I18nInstance } from "i18next";
import type { Dispatch, SetStateAction } from "react";

import type { AppTheme } from "../../../../ui/theme";
import type { ServiceEntry, Workshop } from "../../../../types/domain";
import type { StatsPanelStyles } from "./statsPanelStyles";

export type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";

export type StatisticsPanelProps = {
  styles: StatsPanelStyles;
  theme: AppTheme;
  t: TFunction;
  i18n: I18nInstance;
  currency: string;
  period: PeriodKey;
  vehicleId: string;
  isPremium: boolean;
  onServiceEntryPress: (entryId: string) => void;
  totals: {
    total: number;
    fuelCost: number;
    serviceCost: number;
    avgConsumptionPer100: number;
    avgCostPerLiter: number;
  };
  formatStatNumber: (value: number, fractionDigits: number) => string;
  totalMain: string;
  fuelMain: string;
  serviceMain: string;
  mileageOverTimeSeries: { x: string; y: number }[];
  formatChartMonth: (key: string) => string;
  formatChartMonthFull: (key: string) => string;
  formatChartYAxisLabel: (value: number) => string;
  formatMileageChartValue: (value: number) => string;
  formatExpenseChartValue: (value: number) => string;
  showChartInfo: (
    section:
      | "mileageOverTime"
      | "expensesOverTime"
      | "expensesByCategory"
      | "oilChange",
  ) => void;
  consumptionUnitLine: string;
  fuelUnitShort: string;
  fuelUnitLabel: string;
  distanceUnitLabel: string;
  lastRefuelShowAmount: boolean;
  setLastRefuelShowAmount: Dispatch<SetStateAction<boolean>>;
  canToggleLastRefuel: boolean;
  lastRefuelAmount: number;
  lastRefuelValueMain: string;
  lastRefuelValueSuffix: string | undefined;
  fuelStatsDistance: number | null;
  fuelIntervals: { avgDays: number };
  avgRefuelAmount: number;
  navigateToFuel: () => void;
  recentServiceEntries: ServiceEntry[];
  workshopsById: Record<string, Workshop>;
  navigateToServiceHistory: () => void;
  categorySeries: {
    key: string;
    label: string;
    value: number;
    color: string;
  }[];
  chartViewportWidth: number;
  isNarrow: boolean;
  legendShowPercent: boolean;
  setLegendShowPercent: Dispatch<SetStateAction<boolean>>;
  visibleCategorySeries: StatisticsPanelProps["categorySeries"];
  totalByCategory: number;
  hasHiddenCategoryItems: boolean;
  showAllCategoryLegend: boolean;
  setShowAllCategoryLegend: Dispatch<SetStateAction<boolean>>;
  monthlyExpensesSeries: {
    data: {
      x: string;
      fuel: number;
      service: number;
      total: number;
    }[];
  };
  oilLastChangeShowDate: boolean;
  setOilLastChangeShowDate: Dispatch<SetStateAction<boolean>>;
  lastOilChangeDateLabel: string;
  lastOilChange: ServiceEntry | null;
  oilAvgIntervalShowMonths: boolean;
  setOilAvgIntervalShowMonths: Dispatch<SetStateAction<boolean>>;
  oilIntervals: { avgMonths: number; avgKm: number };
  oilLife: {
    progressPercent: number;
    isOverdue: boolean;
    isDueSoon: boolean;
    remainingDays: number;
    remainingKm: number | null;
  } | null;
  oilLifeStatusText: string;
  oilLifeProgressPercent: number;
  oilLifeOverlayTextWidthPercent: number;
  fmtNumber: (n: number, digits: number, locale: string) => string;
  fmtMonths: (n: number, locale: string) => string;
  fmtMoney: (value: number, currency: string) => string;
  groupThousands: (
    value: number,
    fractionDigits: number,
    locale: string,
  ) => string;
  fmtPct: (pct: number) => string;
};
