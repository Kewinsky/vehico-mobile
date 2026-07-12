import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";

import type { FuelingEntry, MileageAudit, ServiceEntry, Vehicle } from "../../../../types/domain";
import { useTheme } from "../../../../ui/ThemeProvider";
import { groupThousands } from "../../../../utils/numberFormatting";
import {
  fmtMoney,
  fmtMonths,
  fmtNumber,
  fmtPct,
  formatChartMonthKey,
  formatChartMonthKeyFull,
  formatChartYAxisLabel,
} from "../../statistics/domain/math";
import {
  CHART_BAR_HEIGHT,
  CHART_LINE_HEIGHT,
  CHART_Y_AXIS_WIDTH,
  getChartScale,
  getMileageChartScale,
  getScrollableChartWidth,
} from "./charts/charts";
import {
  buildCategorySeries,
  computeVehicleStatistics,
} from "./domain/computeVehicleStatistics";
import type { PeriodKey } from "./types";

type UseVehicleStatisticsInput = {
  period: PeriodKey;
  service: ServiceEntry[];
  fueling: FuelingEntry[];
  mileageAudit: MileageAudit[];
  vehicle: Vehicle | null;
  currency: string;
  distanceUnitLabel: string;
  fuelUnitLabel: string;
  showAllCategoryLegend: boolean;
  includeCharts?: boolean;
};

export function useVehicleStatistics({
  period,
  service,
  fueling,
  mileageAudit,
  vehicle,
  currency,
  distanceUnitLabel,
  fuelUnitLabel,
  showAllCategoryLegend,
  includeCharts = true,
}: UseVehicleStatisticsInput) {
  const { t, i18n } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const chartLocale = i18n.language === "pl" ? "pl" : "en";

  const formatChartMonth = useCallback(
    (key: string) => formatChartMonthKey(key, chartLocale),
    [chartLocale],
  );
  const formatChartMonthFull = useCallback(
    (key: string) => formatChartMonthKeyFull(key, chartLocale),
    [chartLocale],
  );
  const formatStatNumber = useCallback(
    (value: number, fractionDigits: number) => {
      if (!Number.isFinite(value)) return "–";
      const sign = value < 0 ? "-" : "";
      const abs = Math.abs(value);
      const [integerPart, fractionPart] = abs
        .toFixed(fractionDigits)
        .split(".");
      const isPolish = i18n.language.startsWith("pl");
      const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      if (!fractionPart) return `${sign}${groupedInteger}`;
      return `${sign}${groupedInteger}${isPolish ? "," : "."}${fractionPart}`;
    },
    [i18n.language],
  );
  const formatMileageChartValue = useCallback(
    (value: number) =>
      `${groupThousands(Math.round(value), 0, chartLocale)} ${distanceUnitLabel}`,
    [chartLocale, distanceUnitLabel],
  );
  const formatExpenseChartValue = useCallback(
    (value: number) => fmtMoney(value, currency),
    [currency],
  );

  const labelForCategory = useCallback((key: string) => {
    if (key === "fuel") return tRef.current("dashboard.stats.categories.fuel");
    return tRef.current(`entryForm.categories.${key}`);
  }, []);

  const snapshot = useMemo(
    () =>
      computeVehicleStatistics({
        period,
        service,
        fueling,
        mileageAudit,
        vehicle,
        labelForCategory,
      }),
    [period, service, fueling, mileageAudit, vehicle, labelForCategory],
  );

  const categorySeries = useMemo(
    () =>
      includeCharts
        ? buildCategorySeries(snapshot.expensesByCategory, theme.colors.accent)
        : [],
    [includeCharts, snapshot.expensesByCategory, theme.colors.accent],
  );

  const totalByCategory = useMemo(
    () => categorySeries.reduce((sum, item) => sum + item.value, 0),
    [categorySeries],
  );

  const visibleCategorySeries = useMemo(
    () =>
      showAllCategoryLegend ? categorySeries : categorySeries.slice(0, 3),
    [categorySeries, showAllCategoryLegend],
  );

  const chartViewportWidth = includeCharts
    ? Math.max(280, windowWidth - theme.layout.contentPaddingHorizontal * 2)
    : 0;
  const chartScrollViewportWidth = includeCharts
    ? Math.max(0, chartViewportWidth - CHART_Y_AXIS_WIDTH)
    : 0;
  const barChartWidth = includeCharts
    ? getScrollableChartWidth(
        snapshot.monthlyExpensesSeries.data.length,
        chartScrollViewportWidth,
      )
    : 0;
  const mileageChartWidth = includeCharts
    ? getScrollableChartWidth(
        snapshot.mileageOverTimeSeries.length,
        chartScrollViewportWidth,
      )
    : 0;
  const barChartScale = useMemo(
    () =>
      includeCharts
        ? getChartScale(
            snapshot.monthlyExpensesSeries.data.map((item) => item.total),
            CHART_BAR_HEIGHT,
          )
        : { niceMaxY: 0, yTicks: [] },
    [includeCharts, snapshot.monthlyExpensesSeries.data],
  );
  const mileageChartScale = useMemo(
    () =>
      includeCharts
        ? getMileageChartScale(
            snapshot.mileageOverTimeSeries.map((item) => item.y),
            CHART_LINE_HEIGHT,
          )
        : { minY: 0, niceMaxY: 0, yTicks: [] },
    [includeCharts, snapshot.mileageOverTimeSeries],
  );

  const formatExpenseAmount = useCallback(
    (value: number) =>
      value > 0
        ? formatStatNumber(
            value >= 10 ? Math.round(value) : value,
            value >= 10 ? 0 : 1,
          )
        : "–",
    [formatStatNumber],
  );

  const lastRefuelAmount = Number(snapshot.lastFueling?.fuel_amount ?? Number.NaN);
  const lastRefuelAmountMain = Number.isFinite(lastRefuelAmount)
    ? formatStatNumber(lastRefuelAmount, 0)
    : "–";
  const lastRefuelHint =
    snapshot.daysSinceLastRefuel != null
      ? t("dashboard.stats.daysAgo", { days: snapshot.daysSinceLastRefuel })
      : null;

  return useMemo(
    () => ({
      snapshot,
      categorySeries,
      visibleCategorySeries,
      totalByCategory,
      hasHiddenCategoryItems: categorySeries.length > 3,
      chartViewportWidth,
      chartScrollViewportWidth,
      barChartWidth,
      mileageChartWidth,
      barChartScale,
      mileageChartScale,
      isNarrow: windowWidth < 380,
      formatChartMonth,
      formatChartMonthFull,
      formatStatNumber,
      formatMileageChartValue,
      formatExpenseChartValue,
      formatExpenseAmount,
      totalMain: formatExpenseAmount(snapshot.totals.total),
      fuelMain: formatExpenseAmount(snapshot.totals.fuelCost),
      serviceMain: formatExpenseAmount(snapshot.totals.serviceCost),
      fuelStatsDistance:
        snapshot.totals.totalDistance > 0 ? snapshot.totals.totalDistance : null,
      lastRefuelAmount,
      lastRefuelAmountMain,
      lastRefuelHint,
      canToggleLastRefuel:
        Number.isFinite(lastRefuelAmount) && lastRefuelHint != null,
      formatChartYAxisLabel,
      fmtNumber,
      fmtMonths,
      fmtMoney,
      fmtPct,
      groupThousands,
    }),
    [
      snapshot,
      categorySeries,
      visibleCategorySeries,
      totalByCategory,
      chartViewportWidth,
      chartScrollViewportWidth,
      barChartWidth,
      mileageChartWidth,
      barChartScale,
      mileageChartScale,
      windowWidth,
      formatChartMonth,
      formatChartMonthFull,
      formatStatNumber,
      formatMileageChartValue,
      formatExpenseChartValue,
      formatExpenseAmount,
      lastRefuelAmount,
      lastRefuelAmountMain,
      lastRefuelHint,
    ],
  );
}
