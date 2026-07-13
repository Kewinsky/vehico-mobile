import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, useWindowDimensions } from "react-native";

import type { AppStackParamList } from "../../../../app/navigation/RootNavigator";
import { useScreenFocusReload } from "../../../../app/useScreenFocusReload";
import { useUnitDisplay } from "../../../../app/hooks/useUnitDisplay";
import { useEntitlements } from "../../../../app/providers/EntitlementsProvider";
import { useUserSettings } from "../../../../app/providers/UserSettingsProvider";
import { listMileageAudit } from "../../../../services/mileage/mileageAuditRepo";
import { listWorkshops } from "../../../../services/workshops/workshopsRepo";
import type {
  FuelingEntry,
  MileageAudit,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
  Workshop,
} from "../../../../types/domain";
import { SERVICE_CATEGORY_COLORS } from "../../../../ui/theme/serviceCategoryColors";
import { useTheme } from "../../../../ui/ThemeProvider";
import { toastCaughtError, toastError } from "../../../../ui/toast/toast";
import { formatShortDisplayDate } from "../../../../utils/dateFormatting";
import { groupThousands } from "../../../../utils/numberFormatting";
import {
  clampNonNeg,
  fmtMoney,
  fmtMonths,
  fmtNumber,
  fmtPct,
  formatChartMonthKey,
  formatChartMonthKeyFull,
  formatChartYAxisLabel,
  listMonthKeysInclusive,
  monthKey,
  parseDateLoose,
} from "../../statistics/domain/math";
import {
  CHART_BAR_HEIGHT,
  CHART_LINE_HEIGHT,
  CHART_Y_AXIS_WIDTH,
  getChartScale,
  getMileageChartScale,
  getScrollableChartWidth,
} from "./charts/charts";
import { OIL_CHANGE_INTERVAL_DAYS, OIL_CHANGE_INTERVAL_KM } from "./constants";
import { useStatsPanelStyles } from "./statsPanelStyles";
import type { PeriodKey, StatisticsPanelProps } from "./types";

export type UseStatisticsPanelInput = {
  vehicleId: string;
  period: PeriodKey;
  vehicle: Vehicle | null;
  serviceEntries: ServiceEntry[];
  fuelingEntries: FuelingEntry[];
  navigation: NativeStackNavigationProp<AppStackParamList>;
};

export function useStatisticsPanel({
  vehicleId,
  period,
  vehicle,
  serviceEntries,
  fuelingEntries,
  navigation,
}: UseStatisticsPanelInput): StatisticsPanelProps {
  const { t, i18n } = useTranslation();
  const chartLocale = i18n.language === "pl" ? "pl" : "en";
  const formatChartMonth = (key: string) =>
    formatChartMonthKey(key, chartLocale);
  const formatChartMonthFull = (key: string) =>
    formatChartMonthKeyFull(key, chartLocale);
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { width: windowWidth } = useWindowDimensions();
  const { isPremium } = useEntitlements();

  const [legendShowPercent, setLegendShowPercent] = useState(true);
  const [showAllCategoryLegend, setShowAllCategoryLegend] = useState(false);
  const [oilLastChangeShowDate, setOilLastChangeShowDate] = useState(true);
  const [oilAvgIntervalShowMonths, setOilAvgIntervalShowMonths] =
    useState(true);
  const [lastRefuelShowAmount, setLastRefuelShowAmount] = useState(true);
  const [mileageAudit, setMileageAudit] = useState<MileageAudit[]>([]);
  const [workshopsById, setWorkshopsById] = useState<Record<string, Workshop>>(
    {},
  );

  const styles = useStatsPanelStyles();
  const currency = settings?.currency ?? "PLN";
  const { distanceUnitLabel, fuelUnitShort, consumptionUnitLine } =
    useUnitDisplay();
  const fuelUnitLabel = fuelUnitShort;

  const load = useCallback(async () => {
    try {
      const [auditRows, workshops] = await Promise.all([
        listMileageAudit(vehicleId),
        listWorkshops(),
      ]);
      setMileageAudit(auditRows);
      const workshopMap = workshops.reduce<Record<string, Workshop>>(
        (acc, workshop) => {
          acc[workshop.id] = workshop;
          return acc;
        },
        {},
      );
      setWorkshopsById(workshopMap);
    } catch (err: any) {
      toastCaughtError(err, t("common.error"));
    }
  }, [vehicleId, t]);

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => load(),
    deferFocusReload: true,
  });

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = todayStr.slice(0, 7);
    let startMonthStr: string | null = null;
    if (period !== "all") {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      let monthsBack = 0;
      if (period === "1m") monthsBack = 0;
      else if (period === "3m") monthsBack = 2;
      else if (period === "6m") monthsBack = 5;
      else if (period === "1y") monthsBack = 11;
      const startDate = new Date(currentYear, currentMonth - monthsBack, 1);
      startMonthStr = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1,
      ).padStart(2, "0")}`;
    }
    const serviceIn = serviceEntries.filter((x) => {
      const entryDateStr = x.service_date.slice(0, 10);
      if (entryDateStr > todayStr) return false;
      if (period === "all") return true;
      const entryMonthStr = entryDateStr.slice(0, 7);
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });
    const fuelingIn = fuelingEntries.filter((x) => {
      const entryDateStr = x.date;
      if (entryDateStr > todayStr) return false;
      if (period === "all") return true;
      const entryMonthStr = entryDateStr.slice(0, 7);
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });
    const mileageAuditIn = mileageAudit.filter((row) => {
      const entryDateStr = row.reading_date.slice(0, 10);
      if (entryDateStr > todayStr) return false;
      if (period === "all") return true;
      const entryMonthStr = entryDateStr.slice(0, 7);
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });
    return {
      service: serviceIn,
      fueling: fuelingIn,
      mileageAudit: mileageAuditIn,
    };
  }, [period, fuelingEntries, mileageAudit, serviceEntries]);

  const monthRange = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentMonthStr = todayStr.slice(0, 7);
    if (period === "all") {
      return { startMonthStr: null as string | null, currentMonthStr };
    }
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    let monthsBack = 0;
    if (period === "1m") monthsBack = 0;
    else if (period === "3m") monthsBack = 2;
    else if (period === "6m") monthsBack = 5;
    else if (period === "1y") monthsBack = 11;
    const startDate = new Date(currentYear, currentMonth - monthsBack, 1);
    const startMonthStr = `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1,
    ).padStart(2, "0")}`;
    return { startMonthStr, currentMonthStr };
  }, [period]);

  const totals = useMemo(() => {
    const serviceCost = filtered.service.reduce(
      (sum, x) => sum + Number(x.cost ?? 0),
      0,
    );
    const fuelCost = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.fuel_cost ?? 0),
      0,
    );
    const totalDistance = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.distance ?? 0),
      0,
    );
    const totalFuel = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.fuel_amount ?? 0),
      0,
    );
    const total = serviceCost + fuelCost;
    const avgConsumptionPer100 =
      totalDistance > 0 ? (totalFuel / totalDistance) * 100 : Number.NaN;
    const costPer100 =
      totalDistance > 0 ? (total / totalDistance) * 100 : Number.NaN;
    const avgCostPerLiter = totalFuel > 0 ? fuelCost / totalFuel : Number.NaN;
    return {
      serviceCost,
      fuelCost,
      total,
      totalDistance,
      totalFuel,
      avgConsumptionPer100,
      costPer100,
      avgCostPerLiter,
    };
  }, [filtered.service, filtered.fueling]);

  const expensesByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    const add = (key: string, amount: number) => {
      acc[key] = (acc[key] ?? 0) + clampNonNeg(amount);
    };
    for (const f of filtered.fueling) add("fuel", Number(f.fuel_cost ?? 0));
    for (const s of filtered.service) {
      const cat = (s.category ?? "other") as ServiceEntryCategory | "other";
      add(cat, Number(s.cost ?? 0));
    }
    const items = Object.entries(acc)
      .map(([key, value]) => ({ key, value: value ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    const label = (k: string) => {
      if (k === "fuel") return t("dashboard.stats.categories.fuel");
      return t(`entryForm.categories.${k}`);
    };
    return items.map((x) => ({ ...x, label: label(x.key) }));
  }, [filtered.service, filtered.fueling, t]);

  const monthlyExpensesSeries = useMemo(() => {
    const byMonthFuel: Record<string, number> = {};
    const byMonthService: Record<string, number> = {};
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      const k = monthKey(d);
      byMonthFuel[k] =
        (byMonthFuel[k] ?? 0) + clampNonNeg(Number(f.fuel_cost ?? 0));
    }
    for (const s of filtered.service) {
      const d = parseDateLoose(s.service_date);
      if (!d) continue;
      const k = monthKey(d);
      byMonthService[k] =
        (byMonthService[k] ?? 0) + clampNonNeg(Number(s.cost ?? 0));
    }
    const keysWithData = Array.from(
      new Set([...Object.keys(byMonthFuel), ...Object.keys(byMonthService)]),
    ).sort();
    const monthKeys =
      period === "all"
        ? keysWithData.length > 0
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
    const data = monthKeys.map((k) => {
      const fuel = byMonthFuel[k] ?? 0;
      const service = byMonthService[k] ?? 0;
      return { x: k, fuel, service, total: fuel + service };
    });
    return { data };
  }, [filtered.service, filtered.fueling, period, monthRange]);

  const recentServiceEntries = useMemo(() => {
    return [...serviceEntries]
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      )
      .slice(0, 3);
  }, [serviceEntries]);

  const lastFueling = useMemo(() => {
    if (filtered.fueling.length === 0) return null;
    return [...filtered.fueling].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    )[0];
  }, [filtered.fueling]);

  const fuelIntervals = useMemo(() => {
    const sorted = [...filtered.fueling].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
    if (sorted.length < 2) return { avgDays: Number.NaN };
    const dayDeltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = parseDateLoose(sorted[i - 1]!.date);
      const currDate = parseDateLoose(sorted[i]!.date);
      if (!prevDate || !currDate) continue;
      const days = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days > 0) dayDeltas.push(days);
    }
    const avgDays =
      dayDeltas.length > 0
        ? dayDeltas.reduce((sum, value) => sum + value, 0) / dayDeltas.length
        : Number.NaN;
    return { avgDays };
  }, [filtered.fueling]);

  const avgRefuelAmount = useMemo(() => {
    const amounts = filtered.fueling
      .map((entry) => Number(entry.fuel_amount ?? Number.NaN))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (amounts.length === 0) return Number.NaN;
    return amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  }, [filtered.fueling]);

  const mileageOverTimeSeries = useMemo(() => {
    const byMonthMax: Record<string, number> = {};
    for (const entry of filtered.service) {
      const mileage = entry.mileage;
      if (mileage == null || !Number.isFinite(mileage) || mileage <= 0) {
        continue;
      }
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
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
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
  }, [filtered.mileageAudit, filtered.service, period, monthRange]);

  const lastOilChange = useMemo(() => {
    const oilEntries = serviceEntries
      .filter((e) => (e.category ?? "other") === "oil_change")
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      );
    return oilEntries[0] ?? null;
  }, [serviceEntries]);

  const oilIntervals = useMemo(() => {
    const oilEntries = serviceEntries
      .filter((e) => (e.category ?? "other") === "oil_change")
      .sort(
        (a, b) =>
          new Date(a.service_date).getTime() -
          new Date(b.service_date).getTime(),
      );
    if (oilEntries.length < 2)
      return { avgKm: Number.NaN, avgMonths: Number.NaN };
    const kmDeltas: number[] = [];
    const monthDeltas: number[] = [];
    for (let i = 1; i < oilEntries.length; i++) {
      const prev = oilEntries[i - 1];
      const curr = oilEntries[i];
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
    const avgKm =
      kmDeltas.length > 0
        ? kmDeltas.reduce((a, b) => a + b, 0) / kmDeltas.length
        : Number.NaN;
    const avgMonths =
      monthDeltas.length > 0
        ? monthDeltas.reduce((a, b) => a + b, 0) / monthDeltas.length
        : Number.NaN;
    return { avgKm, avgMonths };
  }, [serviceEntries]);

  const lastOilChangeDateLabel = formatShortDisplayDate(
    lastOilChange?.service_date ?? null,
    i18n.language,
  );

  const oilLife = useMemo(() => {
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
    const currentMileage = vehicle?.mileage;
    const dueMileage =
      lastMileage != null ? lastMileage + OIL_CHANGE_INTERVAL_KM : null;
    const mileageRatio =
      lastMileage != null && currentMileage != null
        ? Math.max(0, currentMileage - lastMileage) / OIL_CHANGE_INTERVAL_KM
        : Number.NaN;

    const ratios = [dateRatio, mileageRatio].filter((x) => Number.isFinite(x));
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
    const remainingDays = isOverdue ? 0 : computedRemainingDays;
    const remainingKm = isOverdue ? 0 : computedRemainingKm;

    return {
      progressPercent,
      progressRatio,
      remainingDays,
      remainingKm,
      dueDateLabel: dueDate.toISOString().slice(0, 10),
      dueMileage,
      isOverdue,
      isDueSoon,
    };
  }, [lastOilChange, vehicle]);

  const fuelStatsDistance =
    totals.totalDistance > 0 ? totals.totalDistance : null;
  const lastRefuelAmount = Number(lastFueling?.fuel_amount ?? Number.NaN);

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

  const lastRefuelAmountMain = Number.isFinite(lastRefuelAmount)
    ? formatStatNumber(lastRefuelAmount, 0)
    : "–";

  const daysSinceLastRefuel = useMemo(() => {
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
  }, [lastFueling]);

  const lastRefuelHint =
    daysSinceLastRefuel != null
      ? t("dashboard.stats.daysAgo", { days: daysSinceLastRefuel })
      : null;
  const canToggleLastRefuel =
    Number.isFinite(lastRefuelAmount) && lastRefuelHint != null;
  const lastRefuelValueMain = lastRefuelShowAmount
    ? lastRefuelAmountMain
    : (lastRefuelHint ?? "–");
  const lastRefuelValueSuffix = lastRefuelShowAmount
    ? Number.isFinite(lastRefuelAmount)
      ? fuelUnitLabel
      : undefined
    : undefined;

  const navigateToServiceHistory = useCallback(() => {
    navigation.navigate("ServiceHistory", { vehicleId });
  }, [navigation, vehicleId]);

  const navigateToFuel = useCallback(() => {
    navigation.navigate("Fuel", { vehicleId });
  }, [navigation, vehicleId]);

  const showChartInfo = useCallback(
    (
      section:
        | "mileageOverTime"
        | "expensesOverTime"
        | "expensesByCategory"
        | "oilChange",
    ) => {
      const info =
        section === "mileageOverTime"
          ? {
              title: t("dashboard.stats.chartInfo.mileageOverTimeTitle"),
              body: t("dashboard.stats.chartInfo.mileageOverTimeBody", {
                unit: distanceUnitLabel,
              }),
            }
          : section === "expensesOverTime"
            ? {
                title: t("dashboard.stats.chartInfo.expensesOverTimeTitle"),
                body: t("dashboard.stats.chartInfo.expensesOverTimeBody"),
              }
            : section === "expensesByCategory"
              ? {
                  title: t("dashboard.stats.chartInfo.expensesByCategoryTitle"),
                  body: t("dashboard.stats.chartInfo.expensesByCategoryBody"),
                }
              : {
                  title: t("dashboard.stats.chartInfo.oilChangeTitle"),
                  body: t("dashboard.stats.chartInfo.oilChangeBody", {
                    category: t("entryForm.categories.oil_change"),
                  }),
                };
      Alert.alert(info.title, info.body);
    },
    [distanceUnitLabel, t],
  );

  const chartViewportWidth = Math.max(
    280,
    windowWidth - theme.layout.contentPaddingHorizontal * 2,
  );
  const chartScrollViewportWidth = Math.max(
    0,
    chartViewportWidth - CHART_Y_AXIS_WIDTH,
  );
  const barChartWidth = getScrollableChartWidth(
    monthlyExpensesSeries.data.length,
    chartScrollViewportWidth,
  );
  const mileageChartWidth = getScrollableChartWidth(
    mileageOverTimeSeries.length,
    chartScrollViewportWidth,
  );
  const barChartScale = getChartScale(
    monthlyExpensesSeries.data.map((item) => item.total),
    CHART_BAR_HEIGHT,
  );
  const mileageChartScale = useMemo(
    () =>
      getMileageChartScale(
        mileageOverTimeSeries.map((item) => item.y),
        CHART_LINE_HEIGHT,
      ),
    [mileageOverTimeSeries],
  );
  const categorySeries = useMemo(
    () =>
      expensesByCategory.map((x) => ({
        ...x,
        color:
          x.key in SERVICE_CATEGORY_COLORS
            ? SERVICE_CATEGORY_COLORS[
                x.key as keyof typeof SERVICE_CATEGORY_COLORS
              ]
            : theme.colors.accent,
      })),
    [expensesByCategory, theme.colors.accent],
  );
  const totalByCategory = useMemo(
    () => categorySeries.reduce((s, x) => s + clampNonNeg(x.value), 0),
    [categorySeries],
  );
  const visibleCategorySeries = useMemo(
    () => (showAllCategoryLegend ? categorySeries : categorySeries.slice(0, 3)),
    [categorySeries, showAllCategoryLegend],
  );
  const hasHiddenCategoryItems = categorySeries.length > 3;
  const isNarrow = windowWidth < 380;

  const formatMileageChartValue = useCallback(
    (value: number) =>
      `${groupThousands(Math.round(value), 0, chartLocale)} ${distanceUnitLabel}`,
    [chartLocale, distanceUnitLabel],
  );
  const formatExpenseChartValue = useCallback(
    (value: number) => fmtMoney(value, currency),
    [currency],
  );

  const formatExpenseAmount = (value: number) =>
    value > 0
      ? formatStatNumber(
          value >= 10 ? Math.round(value) : value,
          value >= 10 ? 0 : 1,
        )
      : "–";
  const totalMain = formatExpenseAmount(totals.total);
  const fuelMain = formatExpenseAmount(totals.fuelCost);
  const serviceMain = formatExpenseAmount(totals.serviceCost);

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
    oilLifeProgressPercent > 0 ? 100 / (oilLifeProgressPercent / 100) : 100;

  const onServiceEntryPress = useCallback(
    (entryId: string) => {
      navigation.navigate("ServiceEntryForm", { entryId, vehicleId });
    },
    [navigation, vehicleId],
  );

  return {
    styles,
    theme,
    t,
    i18n,
    currency,
    period,
    vehicleId,
    isPremium,
    navigation,
    onServiceEntryPress,
    totals,
    formatStatNumber,
    totalMain,
    fuelMain,
    serviceMain,
    mileageOverTimeSeries,
    mileageChartScale,
    chartScrollViewportWidth,
    mileageChartWidth,
    formatChartMonth,
    formatChartMonthFull,
    formatChartYAxisLabel,
    formatMileageChartValue,
    formatExpenseChartValue,
    showChartInfo,
    consumptionUnitLine,
    fuelUnitShort,
    fuelUnitLabel,
    distanceUnitLabel,
    lastRefuelShowAmount,
    setLastRefuelShowAmount,
    canToggleLastRefuel,
    lastRefuelAmount,
    lastRefuelValueMain,
    lastRefuelValueSuffix,
    fuelStatsDistance,
    fuelIntervals,
    avgRefuelAmount,
    navigateToFuel,
    recentServiceEntries,
    workshopsById,
    navigateToServiceHistory,
    categorySeries,
    chartViewportWidth,
    isNarrow,
    legendShowPercent,
    setLegendShowPercent,
    visibleCategorySeries,
    totalByCategory,
    hasHiddenCategoryItems,
    showAllCategoryLegend,
    setShowAllCategoryLegend,
    monthlyExpensesSeries,
    barChartScale,
    barChartWidth,
    oilLastChangeShowDate,
    setOilLastChangeShowDate,
    lastOilChangeDateLabel,
    lastOilChange,
    oilAvgIntervalShowMonths,
    setOilAvgIntervalShowMonths,
    oilIntervals,
    oilLife,
    oilLifeStatusText,
    oilLifeProgressPercent,
    oilLifeOverlayTextWidthPercent,
    fmtNumber,
    fmtMonths,
    fmtMoney,
    groupThousands,
    fmtPct,
  };
}
