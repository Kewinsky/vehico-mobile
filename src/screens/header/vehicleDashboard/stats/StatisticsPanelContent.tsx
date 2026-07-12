import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";

import { routes } from "../../../../core/navigation/routes";
import { useUnitDisplay } from "../../../../core/hooks/useUnitDisplay";
import { useTheme } from "../../../../ui/ThemeProvider";
import { formatShortDisplayDate } from "../../../../utils/dateFormatting";
import { type DashboardStatsSectionId } from "../sections/sectionIds";
import { useVehicleDashboard } from "../VehicleDashboardProvider";
import { useDashboardSectionOrder } from "../useDashboardSectionOrder";
import { ExpenseSummarySection } from "./sections/ExpenseSummarySection";
import { ExpensesByCategorySection } from "./sections/ExpensesByCategorySection";
import { ExpensesOverTimeSection } from "./sections/ExpensesOverTimeSection";
import { FuelStatsSection } from "./sections/FuelStatsSection";
import { MileageOverTimeChartSection } from "./sections/MileageOverTimeChartSection";
import { OilChangeSection } from "./sections/OilChangeSection";
import { RecentServiceSection } from "./sections/RecentServiceSection";
import { useStatisticsSupplementalData } from "./useStatisticsSupplementalData";
import { useVehicleStatistics } from "./useVehicleStatistics";
import { useStatsPanelStyles } from "./statsPanelStyles";
import type { PeriodKey, StatisticsPanelProps } from "./types";

const PREMIUM_STATS_SECTIONS = new Set<DashboardStatsSectionId>([
  "mileageOverTimeChart",
  "expensesByCategory",
  "oilChange",
]);

const CHART_SECTIONS = new Set<DashboardStatsSectionId>([
  "mileageOverTimeChart",
  "expensesByCategory",
  "expensesOverTime",
]);

type ChartInfoSection = Parameters<StatisticsPanelProps["showChartInfo"]>[0];

type Props = {
  period: PeriodKey;
};

export function StatisticsPanelContent({ period }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useStatsPanelStyles();
  const { fuelUnitShort, consumptionUnitLine, distanceUnitLabel } =
    useUnitDisplay();

  const {
    vehicleId,
    vehicle,
    serviceEntries,
    fuelingEntries,
    isPremium,
    currency,
  } = useVehicleDashboard();

  const { mileageAudit, workshopsById } =
    useStatisticsSupplementalData(vehicleId);

  const [legendShowPercent, setLegendShowPercent] = useState(true);
  const [showAllCategoryLegend, setShowAllCategoryLegend] = useState(false);
  const [oilLastChangeShowDate, setOilLastChangeShowDate] = useState(true);
  const [oilAvgIntervalShowMonths, setOilAvgIntervalShowMonths] =
    useState(true);
  const [lastRefuelShowAmount, setLastRefuelShowAmount] = useState(true);

  const stats = useVehicleStatistics({
    period,
    service: serviceEntries,
    fueling: fuelingEntries,
    mileageAudit,
    vehicle,
    currency,
    distanceUnitLabel,
    fuelUnitLabel: fuelUnitShort,
    showAllCategoryLegend,
    includeCharts: false,
  });
  const { snapshot } = stats;

  const lastRefuelValueMain = lastRefuelShowAmount
    ? stats.lastRefuelAmountMain
    : (stats.lastRefuelHint ?? "–");
  const lastRefuelValueSuffix =
    lastRefuelShowAmount && Number.isFinite(stats.lastRefuelAmount)
      ? fuelUnitShort
      : undefined;

  const navigateToServiceHistory = () => {
    router.push(routes.serviceHistory(vehicleId));
  };

  const navigateToFuel = () => {
    router.push(routes.fuel(vehicleId));
  };

  const onServiceEntryPress = (entryId: string) => {
    router.push(routes.serviceEntryForm(vehicleId, entryId));
  };

  const showChartInfo = (section: ChartInfoSection) => {
    const info: Record<ChartInfoSection, { title: string; body: string }> = {
      mileageOverTime: {
        title: t("dashboard.stats.chartInfo.mileageOverTimeTitle"),
        body: t("dashboard.stats.chartInfo.mileageOverTimeBody", {
          unit: distanceUnitLabel,
        }),
      },
      expensesOverTime: {
        title: t("dashboard.stats.chartInfo.expensesOverTimeTitle"),
        body: t("dashboard.stats.chartInfo.expensesOverTimeBody"),
      },
      expensesByCategory: {
        title: t("dashboard.stats.chartInfo.expensesByCategoryTitle"),
        body: t("dashboard.stats.chartInfo.expensesByCategoryBody"),
      },
      oilChange: {
        title: t("dashboard.stats.chartInfo.oilChangeTitle"),
        body: t("dashboard.stats.chartInfo.oilChangeBody", {
          category: t("entryForm.categories.oil_change"),
        }),
      },
    };
    Alert.alert(info[section].title, info[section].body);
  };

  const { oilLife } = snapshot;
  const oilLifeStatusText = oilLife
    ? `${oilLife.progressPercent}% ${
        oilLife.isOverdue
          ? t("dashboard.stats.statusOverdue")
          : oilLife.isDueSoon
            ? t("dashboard.stats.statusDueSoon")
            : t("dashboard.stats.statusOptimal")
      }`
    : "";
  const oilLifeProgressPercent = oilLife
    ? Math.max(0, Math.min(100, oilLife.progressPercent))
    : 0;
  const oilLifeOverlayTextWidthPercent =
    oilLifeProgressPercent > 0
      ? Math.min(400, 100 / (oilLifeProgressPercent / 100))
      : 100;

  const panelProps: StatisticsPanelProps = {
    styles,
    theme,
    t,
    i18n,
    currency,
    period,
    vehicleId,
    isPremium,
    onServiceEntryPress,
    totals: snapshot.totals,
    formatStatNumber: stats.formatStatNumber,
    totalMain: stats.totalMain,
    fuelMain: stats.fuelMain,
    serviceMain: stats.serviceMain,
    mileageOverTimeSeries: snapshot.mileageOverTimeSeries,
    mileageChartScale: stats.mileageChartScale,
    chartScrollViewportWidth: stats.chartScrollViewportWidth,
    mileageChartWidth: stats.mileageChartWidth,
    formatChartMonth: stats.formatChartMonth,
    formatChartMonthFull: stats.formatChartMonthFull,
    formatChartYAxisLabel: stats.formatChartYAxisLabel,
    formatMileageChartValue: stats.formatMileageChartValue,
    formatExpenseChartValue: stats.formatExpenseChartValue,
    showChartInfo,
    consumptionUnitLine,
    fuelUnitShort,
    fuelUnitLabel: fuelUnitShort,
    distanceUnitLabel,
    lastRefuelShowAmount,
    setLastRefuelShowAmount,
    canToggleLastRefuel: stats.canToggleLastRefuel,
    lastRefuelAmount: stats.lastRefuelAmount,
    lastRefuelValueMain,
    lastRefuelValueSuffix,
    fuelStatsDistance: stats.fuelStatsDistance,
    fuelIntervals: snapshot.fuelIntervals,
    avgRefuelAmount: snapshot.avgRefuelAmount,
    navigateToFuel,
    recentServiceEntries: snapshot.recentServiceEntries,
    workshopsById,
    navigateToServiceHistory,
    categorySeries: stats.categorySeries,
    chartViewportWidth: stats.chartViewportWidth,
    isNarrow: stats.isNarrow,
    legendShowPercent,
    setLegendShowPercent,
    visibleCategorySeries: stats.visibleCategorySeries,
    totalByCategory: stats.totalByCategory,
    hasHiddenCategoryItems: stats.hasHiddenCategoryItems,
    showAllCategoryLegend,
    setShowAllCategoryLegend,
    monthlyExpensesSeries: snapshot.monthlyExpensesSeries,
    barChartScale: stats.barChartScale,
    barChartWidth: stats.barChartWidth,
    oilLastChangeShowDate,
    setOilLastChangeShowDate,
    lastOilChangeDateLabel: formatShortDisplayDate(
      snapshot.lastOilChange?.service_date ?? null,
      i18n.language,
    ),
    lastOilChange: snapshot.lastOilChange,
    oilAvgIntervalShowMonths,
    setOilAvgIntervalShowMonths,
    oilIntervals: snapshot.oilIntervals,
    oilLife,
    oilLifeStatusText,
    oilLifeProgressPercent,
    oilLifeOverlayTextWidthPercent,
    fmtNumber: stats.fmtNumber,
    fmtMonths: stats.fmtMonths,
    fmtMoney: stats.fmtMoney,
    groupThousands: stats.groupThousands,
    fmtPct: stats.fmtPct,
  };

  const { orderedIds } = useDashboardSectionOrder("stats");
  const visibleSectionIds = (
    isPremium
      ? orderedIds
      : orderedIds.filter((id) => !PREMIUM_STATS_SECTIONS.has(id))
  ).filter((id) => !CHART_SECTIONS.has(id));

  const sectionRenderers = {
    expenseSummary: () => <ExpenseSummarySection {...panelProps} />,
    mileageOverTimeChart: () => <MileageOverTimeChartSection {...panelProps} />,
    fuelStats: () => <FuelStatsSection {...panelProps} />,
    recentService: () => <RecentServiceSection {...panelProps} />,
    expensesByCategory: () => <ExpensesByCategorySection {...panelProps} />,
    expensesOverTime: () => <ExpensesOverTimeSection {...panelProps} />,
    oilChange: () => <OilChangeSection {...panelProps} />,
  } as const;

  return (
    <View>
      {visibleSectionIds.map((sectionId) => {
        const render = sectionRenderers[sectionId];
        return <View key={sectionId}>{render()}</View>;
      })}
    </View>
  );
}
