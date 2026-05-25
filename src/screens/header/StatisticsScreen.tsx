import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp , NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View, useWindowDimensions } from "react-native";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type {
  FuelingEntry,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
  Workshop,
} from "../../types/domain";
import { SERVICE_CATEGORY_COLORS } from "../../ui/theme/serviceCategoryColors";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { groupThousands } from "../../utils/numberFormatting";
import {
  clampNonNeg,
  fmtMoney,
  fmtMonths,
  fmtNumber,
  fmtPct,
  formatChartMonthKey,
  formatChartYAxisLabel,
  listMonthKeysInclusive,
  monthKey,
  parseDateLoose,
} from "./statistics/domain/math";
import { StatisticsPanelContent } from "./vehicleDashboard/stats/StatisticsPanelContent";
import type { PeriodKey, StatisticsPanelProps } from "./vehicleDashboard/stats/types";
import {
  OIL_CHANGE_INTERVAL_DAYS,
  OIL_CHANGE_INTERVAL_KM,
} from "./vehicleDashboard/stats/constants";
import {
  CHART_BAR_HEIGHT,
  CHART_LINE_HEIGHT,
  CHART_Y_AXIS_WIDTH,
  getChartScale,
  getScrollableChartWidth,
} from "./vehicleDashboard/stats/charts/charts";
import { useStatsPanelStyles } from "./vehicleDashboard/stats/statsPanelStyles";

type ScreenProps = NativeStackScreenProps<AppStackParamList, "Statistics">;
type EmbeddedProps = {
  vehicleId: string;
  embedded: true;
};
type Props = ScreenProps | EmbeddedProps;

function isEmbeddedProps(props: Props): props is EmbeddedProps {
  return "embedded" in props && props.embedded === true;
}


export function StatisticsScreen(props: Props) {
  const { t, i18n } = useTranslation();
  const chartLocale = i18n.language === "pl" ? "pl" : "en";
  const formatChartMonth = (key: string) =>
    formatChartMonthKey(key, chartLocale);
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { width: windowWidth } = useWindowDimensions();
  const embedded = isEmbeddedProps(props);
  const vehicleId = embedded ? props.vehicleId : props.route.params.vehicleId;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isPremium, refresh: refreshEntitlements } = useEntitlements();

  const [period, setPeriod] = useState<PeriodKey>("3m");
  const [legendShowPercent, setLegendShowPercent] = useState(true);
  const [showAllCategoryLegend, setShowAllCategoryLegend] = useState(false);
  const [oilLastChangeShowDate, setOilLastChangeShowDate] = useState(true);
  const [oilAvgIntervalShowMonths, setOilAvgIntervalShowMonths] =
    useState(true);
  const [lastRefuelShowAmount, setLastRefuelShowAmount] = useState(true);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<ServiceEntry[]>([]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [workshopsById, setWorkshopsById] = useState<Record<string, Workshop>>(
    {},
  );

  const styles = useStatsPanelStyles();

  const currency = settings?.currency ?? "PLN";
  const {
    distanceUnitLabel,
    fuelUnitShort,
    consumptionUnitLine,
  } = useUnitDisplay();
  const fuelUnitLabel = fuelUnitShort;

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [v, s, f, workshops] = await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listWorkshops(),
        ]);
        setVehicle(v);
        setService(s);
        setFueling(f);
        const workshopMap = workshops.reduce<Record<string, Workshop>>(
          (acc, workshop) => {
            acc[workshop.id] = workshop;
            return acc;
          },
          {},
        );
        setWorkshopsById(workshopMap);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "1m", label: t("dashboard.stats.periods.1m") },
    { key: "3m", label: t("dashboard.stats.periods.3m") },
    { key: "6m", label: t("dashboard.stats.periods.6m") },
    { key: "1y", label: t("dashboard.stats.periods.1y") },
    { key: "all", label: t("dashboard.stats.periods.all") },
  ];

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
    const serviceIn = service.filter((x) => {
      const entryDateStr = x.service_date.slice(0, 10);
      if (entryDateStr > todayStr) return false;
      if (period === "all") return true;
      const entryMonthStr = entryDateStr.slice(0, 7);
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });
    const fuelingIn = fueling.filter((x) => {
      const entryDateStr = x.date;
      if (entryDateStr > todayStr) return false;
      if (period === "all") return true;
      const entryMonthStr = entryDateStr.slice(0, 7);
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });
    return { service: serviceIn, fueling: fuelingIn };
  }, [period, fueling, service]);

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
    return [...service]
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      )
      .slice(0, 3);
  }, [service]);

  const lastFueling = useMemo(() => {
    if (filtered.fueling.length === 0) return null;
    return [...filtered.fueling].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    )[0];
  }, [filtered.fueling]);

  const costPerDistanceSeries = useMemo(() => {
    const byMonthCost: Record<string, number> = {};
    const byMonthDistance: Record<string, number> = {};
    const addCost = (k: string, amount: number) => {
      byMonthCost[k] = (byMonthCost[k] ?? 0) + clampNonNeg(amount);
    };
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      const k = monthKey(d);
      addCost(k, Number(f.fuel_cost ?? 0));
      byMonthDistance[k] = (byMonthDistance[k] ?? 0) + Number(f.distance ?? 0);
    }
    for (const s of filtered.service) {
      const d = parseDateLoose(s.service_date);
      if (!d) continue;
      addCost(monthKey(d), Number(s.cost ?? 0));
    }
    const keysWithData = Object.keys(byMonthCost).sort();
    const monthKeys =
      period === "all"
        ? keysWithData.length > 0
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
    return monthKeys.map((k) => {
      const distance = byMonthDistance[k] ?? 0;
      const totalCost = byMonthCost[k] ?? 0;
      return { x: k, y: distance > 0 ? totalCost / distance : 0 };
    });
  }, [filtered.fueling, filtered.service, period, monthRange]);

  const fuelVsConsumptionSeries = useMemo(() => {
    const byMonthFuelCost: Record<string, number> = {};
    const byMonthFuelAmount: Record<string, number> = {};
    const byMonthDistance: Record<string, number> = {};
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      const k = monthKey(d);
      byMonthFuelCost[k] =
        (byMonthFuelCost[k] ?? 0) + clampNonNeg(Number(f.fuel_cost ?? 0));
      byMonthFuelAmount[k] =
        (byMonthFuelAmount[k] ?? 0) + clampNonNeg(Number(f.fuel_amount ?? 0));
      byMonthDistance[k] = (byMonthDistance[k] ?? 0) + Number(f.distance ?? 0);
    }
    const keysWithData = Object.keys(byMonthFuelCost).sort();
    const monthKeys =
      period === "all"
        ? keysWithData.length > 0
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
    const consumption = monthKeys.map((k) => {
      const distance = byMonthDistance[k] ?? 0;
      const amount = byMonthFuelAmount[k] ?? 0;
      return { x: k, y: distance > 0 ? (amount / distance) * 100 : 0 };
    });
    const fuelPrice = monthKeys.map((k) => {
      const amount = byMonthFuelAmount[k] ?? 0;
      const cost = byMonthFuelCost[k] ?? 0;
      return { x: k, y: amount > 0 ? cost / amount : 0 };
    });
    return { consumption, fuelPrice };
  }, [filtered.fueling, period, monthRange]);

  const lastOilChange = useMemo(() => {
    const oilEntries = service
      .filter((e) => (e.category ?? "other") === "oil_change")
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      );
    return oilEntries[0] ?? null;
  }, [service]);

  const oilIntervals = useMemo(() => {
    const oilEntries = service
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
  }, [service]);

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
  }, [lastOilChange?.service_date, lastOilChange?.mileage, vehicle?.mileage]);
  const fuelStatsDistance =
    totals.totalDistance > 0 ? totals.totalDistance : null;
  const lastRefuelAmount = Number(lastFueling?.fuel_amount ?? Number.NaN);
  const lastRefuelAmountMain = Number.isFinite(lastRefuelAmount)
    ? String(Math.round(lastRefuelAmount))
    : "—";
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
  }, [lastFueling?.date]);
  const lastRefuelHint =
    daysSinceLastRefuel != null
      ? t("dashboard.stats.daysAgo", { days: daysSinceLastRefuel })
      : null;
  const canToggleLastRefuel =
    Number.isFinite(lastRefuelAmount) && lastRefuelHint != null;
  const lastRefuelValueMain = lastRefuelShowAmount
    ? lastRefuelAmountMain
    : (lastRefuelHint ?? "—");
  const lastRefuelValueSuffix = lastRefuelShowAmount
    ? Number.isFinite(lastRefuelAmount)
      ? fuelUnitLabel
      : undefined
    : undefined;

  const navigateToServiceHistory = useCallback(() => {
    if (embedded) {
      navigation.navigate("ServiceHistory", { vehicleId });
      return;
    }
    props.navigation.navigate("ServiceHistory", { vehicleId });
  }, [embedded, navigation, props, vehicleId]);

  const navigateToFuel = useCallback(() => {
    if (embedded) {
      navigation.navigate("Fuel", { vehicleId });
      return;
    }
    props.navigation.navigate("Fuel", { vehicleId });
  }, [embedded, navigation, props, vehicleId]);

  const showChartInfo = useCallback(
    (
      chart:
        | "costPerKm"
        | "consumptionVsFuelPrice"
        | "expensesOverTime"
        | "expensesByCategory",
    ) => {
      const info =
        chart === "costPerKm"
          ? {
              title: t("dashboard.stats.chartInfo.costPerKmTitle"),
              body: t("dashboard.stats.chartInfo.costPerKmBody"),
            }
          : chart === "consumptionVsFuelPrice"
            ? {
                title: t(
                  "dashboard.stats.chartInfo.consumptionVsFuelPriceTitle",
                ),
                body: t("dashboard.stats.chartInfo.consumptionVsFuelPriceBody"),
              }
            : chart === "expensesOverTime"
              ? {
                  title: t("dashboard.stats.chartInfo.expensesOverTimeTitle"),
                  body: t("dashboard.stats.chartInfo.expensesOverTimeBody"),
                }
              : {
                  title: t("dashboard.stats.chartInfo.expensesByCategoryTitle"),
                  body: t("dashboard.stats.chartInfo.expensesByCategoryBody"),
                };
      Alert.alert(info.title, info.body);
    },
    [t],
  );

  const showOilSectionInfo = useCallback(() => {
    Alert.alert(
      t("dashboard.stats.chartInfo.oilChangeTitle"),
      t("dashboard.stats.chartInfo.oilChangeBody", {
        category: t("entryForm.categories.oil_change"),
      }),
    );
  }, [t]);

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
  const lineChartWidth = getScrollableChartWidth(
    costPerDistanceSeries.length,
    chartScrollViewportWidth,
  );
  const dualLineChartWidth = getScrollableChartWidth(
    fuelVsConsumptionSeries.consumption.length,
    chartScrollViewportWidth,
  );
  const barChartScale = getChartScale(
    monthlyExpensesSeries.data.map((item) => item.total),
    CHART_BAR_HEIGHT,
  );
  const lineChartScale = getChartScale(
    costPerDistanceSeries.map((item) => item.y),
    CHART_LINE_HEIGHT,
  );
  const avgCostPerDistance = useMemo(() => {
    const values = costPerDistanceSeries
      .map((item) => item.y)
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return Number.NaN;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [costPerDistanceSeries]);
  const fuelComparisonScale = getChartScale(
    [
      ...fuelVsConsumptionSeries.consumption.map((item) => item.y),
      ...fuelVsConsumptionSeries.fuelPrice.map((item) => item.y),
    ],
    CHART_LINE_HEIGHT,
  );
  const categorySeries = useMemo(
    () =>
      expensesByCategory.map((x, idx) => ({
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

  const filterPanelContent = (
    <View style={styles.panelWrap}>
      <SegmentTabs<PeriodKey>
        value={period}
        options={periodOptions.map((p) => ({ value: p.key, label: p.label }))}
        onChange={setPeriod}
        size="sm"
        variant="secondary"
      />
    </View>
  );

  const formatExpenseAmount = (value: number) =>
    value > 0
      ? groupThousands(
          value >= 10 ? Math.round(value) : value,
          value >= 10 ? 0 : 1,
          i18n.language,
        )
      : "—";
  const totalMain = formatExpenseAmount(totals.total);
  const fuelMain = formatExpenseAmount(totals.fuelCost);
  const serviceMain = formatExpenseAmount(totals.serviceCost);
  const rollingLocale = i18n.language === "pl" ? "pl-PL" : "en-US";

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

  const panelProps: StatisticsPanelProps = {
    styles,
    theme,
    t,
    i18n,
    currency,
    period,
    vehicleId,
    embedded,
    isPremium,
    navigation,
    onServiceEntryPress,
    totals,
    rollingLocale,
    totalMain,
    fuelMain,
    serviceMain,
    costPerDistanceSeries,
    lineChartScale,
    avgCostPerDistance,
    chartScrollViewportWidth,
    lineChartWidth,
    formatChartMonth,
    formatChartYAxisLabel,
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
    fuelVsConsumptionSeries,
    fuelComparisonScale,
    dualLineChartWidth,
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
    showOilSectionInfo,
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

  const cardContent = <StatisticsPanelContent {...panelProps} />;

  if (embedded) {
    return (
      <View style={{ paddingBottom: theme.spacing.xl }}>
        {filterPanelContent}
        {cardContent}
      </View>
    );
  }

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => props.navigation.goBack()}
      showProfileAvatar
      showShopIcon={!isPremium}
    >
      <NativeHeaderScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
        <ContentHeader
          title={t("dashboard.stats.title")}
          filterPanel={filterPanelContent}
        />
        {cardContent}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

