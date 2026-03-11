import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  Line as SvgLine,
  Path,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../../services/tires/tiresRepo";
import {
  listVehicleWheels,
  formatWheelDimensions,
} from "../../services/wheels/wheelsRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type {
  FuelingEntry,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
  VehicleTire,
  VehicleWheel,
} from "../../types/domain";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { TireIcon } from "../../ui/components/icons/TireIcon";
import { RimIcon } from "../../ui/components/icons/RimIcon";

type Props = NativeStackScreenProps<AppStackParamList, "Statistics">;
type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";
type StatsTabKey = "metrics" | "charts" | "other";
type XY = { x: string; y: number };

function monthKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}
function monthKeyFromYyyyMm(yyyyMm: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12)
    return null;
  return new Date(y, mm - 1, 1);
}
function listMonthKeysInclusive(
  startYyyyMm: string,
  endYyyyMm: string,
): string[] {
  const start = monthKeyFromYyyyMm(startYyyyMm);
  const end = monthKeyFromYyyyMm(endYyyyMm);
  if (!start || !end) return [];
  if (start > end) return [];
  const out: string[] = [];
  const cur = new Date(start.getTime());
  while (cur <= end) {
    out.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
function parseDateLoose(input: string): Date | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function clampNonNeg(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}
function fmtMoney(amount: number, currency: string) {
  const v = clampNonNeg(amount);
  return `${v.toFixed(2)} ${currency}`;
}
function fmtMoneyRounded(amount: number, currency: string) {
  const v = clampNonNeg(amount);
  if (v === 0) return `0 ${currency}`;
  if (v >= 10) return `${Math.round(v)} ${currency}`;
  return `${v.toFixed(1)} ${currency}`;
}
function niceMaxValue(max: number): number {
  if (max <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}
function roundToNice(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let niceNormalized: number;
  if (normalized <= 1.5) niceNormalized = 1;
  else if (normalized <= 3.5) niceNormalized = 2;
  else if (normalized <= 7.5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}
function generateNiceTicks(max: number): number[] {
  const niceMax = niceMaxValue(max);
  const ticks: number[] = [0];
  const targetTicks = 5;
  const rawStep = niceMax / targetTicks;
  const niceStep = roundToNice(rawStep);
  for (let i = niceStep; i <= niceMax; i += niceStep) ticks.push(i);
  if (ticks.length < 4) {
    const smallerStep = niceStep / 2;
    ticks.length = 1;
    for (let i = smallerStep; i <= niceMax; i += smallerStep) ticks.push(i);
  }
  return ticks;
}
function fmtPct(pct: number) {
  if (!Number.isFinite(pct)) return "—";
  return `${Math.round(pct)}%`;
}
function fmtNumber(amount: number, digits = 1) {
  if (!Number.isFinite(amount)) return "—";
  return amount.toFixed(digits);
}
function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

type LineChartYFormat = "currency" | "number";
function SimpleLineChart({
  data,
  width,
  height,
  stroke,
  grid,
  textColor,
  currency,
  yFormat = "currency",
  yUnit = "",
}: {
  data: XY[];
  width: number;
  height: number;
  stroke: string;
  grid: string;
  textColor: string;
  currency: string;
  yFormat?: LineChartYFormat;
  yUnit?: string;
}) {
  const paddingLeft = Math.max(65, Math.min(75, width * 0.15));
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 35;
  const w = width;
  const h = height;
  const maxY = Math.max(1, ...data.map((d) => clampNonNeg(d.y)));
  const niceMaxY = niceMaxValue(maxY);
  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;
  const points = data.map((d, i) => {
    const x =
      paddingLeft +
      (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = paddingTop + (1 - clampNonNeg(d.y) / niceMaxY) * plotH;
    return { x, y, label: d.x, value: d.y };
  });
  const tickValues = generateNiceTicks(maxY);
  const yTicks = tickValues.map((value) => {
    const y = paddingTop + (1 - value / niceMaxY) * plotH;
    return { value, y };
  });
  const xTicks: Array<{ x: number; label: string; index: number }> = [];
  if (data.length > 0) {
    if (data.length <= 5) {
      points.forEach((p, i) => {
        xTicks.push({ x: p.x, label: p.label.replace("-", "/"), index: i });
      });
    } else {
      xTicks.push({
        x: points[0].x,
        label: points[0].label.replace("-", "/"),
        index: 0,
      });
      const mid = Math.floor(data.length / 2);
      xTicks.push({
        x: points[mid].x,
        label: points[mid].label.replace("-", "/"),
        index: mid,
      });
      xTicks.push({
        x: points[points.length - 1].x,
        label: points[points.length - 1].label.replace("-", "/"),
        index: points.length - 1,
      });
    }
  }
  const formatYLabel = (value: number) =>
    yFormat === "currency"
      ? fmtMoneyRounded(value, currency)
      : `${fmtNumber(value, 1)}${yUnit ? ` ${yUnit}` : ""}`;
  return (
    <Svg width={w} height={h}>
      {yTicks.map((tick, i) => (
        <SvgLine
          key={`grid-y-${i}`}
          x1={paddingLeft}
          y1={tick.y}
          x2={paddingLeft + plotW}
          y2={tick.y}
          stroke={grid}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      ))}
      {yTicks.map((tick, i) => (
        <SvgText
          key={`y-label-${i}`}
          x={paddingLeft - 10}
          y={tick.y + 4}
          fontSize={9}
          fill={textColor}
          textAnchor="end"
          alignmentBaseline="middle"
        >
          {formatYLabel(tick.value)}
        </SvgText>
      ))}
      {xTicks.map((tick, i) => (
        <SvgText
          key={`x-label-${i}`}
          x={tick.x}
          y={paddingTop + plotH + 20}
          fontSize={9}
          fill={textColor}
          textAnchor="middle"
          alignmentBaseline="hanging"
        >
          {tick.label}
        </SvgText>
      ))}
      {points.length > 0 ? (
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
        />
      ) : null}
      {points.length > 0 ? (
        <>
          <Circle cx={points[0].x} cy={points[0].y} r={3} fill={stroke} />
          <Circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={3}
            fill={stroke}
          />
        </>
      ) : null}
    </Svg>
  );
}

function SimplePieChart({
  data,
  size,
  colors,
}: {
  data: { label: string; value: number }[];
  size: number;
  colors: string[];
}) {
  const total = data.reduce((s, x) => s + clampNonNeg(x.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size / 2) * 0.92;
  const rInner = rOuter * 0.56;
  let angle = -Math.PI / 2;
  if (total <= 0) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="transparent"
          stroke="#00000022"
          strokeWidth={1}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size}>
      {data.map((s, idx) => {
        const v = clampNonNeg(s.value);
        const slice = (v / total) * Math.PI * 2;
        const start = angle;
        const end = angle + slice;
        angle = end;
        const d = donutSlicePath(cx, cy, rOuter, rInner, start, end);
        return <Path key={s.label} d={d} fill={colors[idx % colors.length]} />;
      })}
    </Svg>
  );
}

export function StatisticsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const vehicleId = route.params.vehicleId;
  const {
    isPremium,
    tiresPerVehicleLimit,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanTireId,
    freePlanWheelId,
  } = useEntitlements();
  const tireOpts = useMemo(
    () =>
      isPremium
        ? undefined
        : freePlanVehicleId === vehicleId
          ? { freePlanTireId: freePlanTireId ?? null }
          : { limit: tiresPerVehicleLimit },
    [
      isPremium,
      vehicleId,
      freePlanVehicleId,
      freePlanTireId,
      tiresPerVehicleLimit,
    ],
  );
  const wheelOpts = useMemo(
    () =>
      isPremium
        ? undefined
        : freePlanVehicleId === vehicleId
          ? { freePlanWheelId: freePlanWheelId ?? null }
          : { limit: wheelsPerVehicleLimit },
    [
      isPremium,
      vehicleId,
      freePlanVehicleId,
      freePlanWheelId,
      wheelsPerVehicleLimit,
    ],
  );

  const [period, setPeriod] = useState<PeriodKey>("3m");
  const [tab, setTab] = useState<StatsTabKey>("metrics");
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<ServiceEntry[]>([]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";
  const fuelUnitLabel =
    fuelUnit === "liters"
      ? t("dashboard.stats.units.liters")
      : t("dashboard.stats.units.gallons");
  const fuelUnitLabelSingular =
    fuelUnit === "liters"
      ? t("dashboard.stats.units.liter")
      : t("dashboard.stats.units.gallon");

  useEffect(() => {
    if (!isFocused) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [v, s, f, tiresData, wheelsData] = await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehicleTires(vehicleId, tireOpts),
          listVehicleWheels(vehicleId, wheelOpts),
        ]);
        if (!alive) return;
        setVehicle(v);
        setService(s);
        setFueling(f);
        setTires(tiresData);
        setWheels(wheelsData);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isFocused, vehicleId, t, tireOpts, wheelOpts]);

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "1m", label: t("dashboard.stats.periods.1m") },
    { key: "3m", label: t("dashboard.stats.periods.3m") },
    { key: "6m", label: t("dashboard.stats.periods.6m") },
    { key: "1y", label: t("dashboard.stats.periods.1y") },
    { key: "all", label: t("dashboard.stats.periods.all") },
  ];
  const tabOptions: { key: StatsTabKey; label: string }[] = [
    { key: "metrics", label: t("dashboard.stats.tabs.metrics") },
    { key: "charts", label: t("dashboard.stats.tabs.charts") },
    { key: "other", label: t("dashboard.stats.tabs.other") },
  ];

  const fittedTires = useMemo(() => {
    const filtered = tires.filter((x) => x.is_currently_fitted);
    return isPremium ? filtered.slice(0, 2) : filtered.slice(0, 1);
  }, [tires, isPremium]);
  const fittedWheels = useMemo(() => {
    const filtered = wheels.filter((x) => x.is_currently_fitted);
    return isPremium ? filtered.slice(0, 2) : filtered.slice(0, 1);
  }, [wheels, isPremium]);

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

  const monthlySeries = useMemo(() => {
    const byMonth: Record<string, number> = {};
    const add = (d: Date, amount: number) => {
      const k = monthKey(d);
      byMonth[k] = (byMonth[k] ?? 0) + clampNonNeg(amount);
    };
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      add(d, Number(f.fuel_cost ?? 0));
    }
    for (const s of filtered.service) {
      const d = parseDateLoose(s.service_date);
      if (!d) continue;
      add(d, Number(s.cost ?? 0));
    }
    const keysWithData = Object.keys(byMonth).sort();
    const monthKeys =
      period === "all"
        ? keysWithData.length > 0
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
    const data = monthKeys.map((k) => ({ x: k, y: byMonth[k] ?? 0 }));
    const monthsWithFuel = new Set<string>();
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      monthsWithFuel.add(monthKey(d));
    }
    const avgMonthlyFuelCost =
      monthsWithFuel.size > 0
        ? totals.fuelCost / monthsWithFuel.size
        : Number.NaN;
    return { data, avgMonthlyFuelCost };
  }, [filtered.service, filtered.fueling, totals.fuelCost, period, monthRange]);

  const favoriteStation = useMemo(() => {
    const countByStation: Record<string, number> = {};
    for (const f of filtered.fueling) {
      const key = f.gas_station ?? "other";
      countByStation[key] = (countByStation[key] ?? 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(countByStation)) {
      if (count > bestCount) {
        bestCount = count;
        best = key;
      }
    }
    return best;
  }, [filtered.fueling]);

  const monthlyDistanceSeries = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      const k = monthKey(d);
      byMonth[k] = (byMonth[k] ?? 0) + Number(f.distance ?? 0);
    }
    const keysWithData = Object.keys(byMonth).sort();
    const monthKeys =
      period === "all"
        ? keysWithData.length > 0
          ? listMonthKeysInclusive(keysWithData[0]!, monthRange.currentMonthStr)
          : []
        : listMonthKeysInclusive(
            monthRange.startMonthStr!,
            monthRange.currentMonthStr,
          );
    return monthKeys.map((k) => ({ x: k, y: byMonth[k] ?? 0 }));
  }, [filtered.fueling, period, monthRange]);

  const lastOilChange = useMemo(() => {
    const oilEntries = service
      .filter((e) => (e.category ?? "other") === "oil_engine")
      .sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime(),
      );
    return oilEntries[0] ?? null;
  }, [service]);

  const oilIntervals = useMemo(() => {
    const oilEntries = service
      .filter((e) => (e.category ?? "other") === "oil_engine")
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

  const lastOilChangeDateLabel = lastOilChange?.service_date
    ? lastOilChange.service_date.slice(0, 10)
    : "—";
  const lastOilChangeMileageLabel =
    lastOilChange?.mileage != null
      ? `${fmtNumber(lastOilChange.mileage, 0)} ${distanceUnit}`
      : "—";
  const oilIntervalAvgKmLabel = Number.isFinite(oilIntervals.avgKm)
    ? `${fmtNumber(oilIntervals.avgKm, 0)} ${distanceUnit}`
    : "—";
  const oilIntervalAvgMonthsLabel = Number.isFinite(oilIntervals.avgMonths)
    ? `${fmtNumber(oilIntervals.avgMonths, 1)} ${t("dashboard.stats.months")}`
    : "—";
  const insuranceValidUntilLabel = vehicle?.insurance_valid_until ?? "—";
  const inspectionValidUntilLabel = vehicle?.inspection_valid_until ?? "—";

  const chartWidth = Math.max(
    280,
    windowWidth - theme.layout.contentPaddingHorizontal * 2,
  );
  const palette = useMemo(
    () => [theme.colors.accent, "#10B981", "#3B82F6", "#A78BFA", "#EF4444"],
    [theme.colors.accent],
  );
  const categorySeries = useMemo(
    () =>
      expensesByCategory.map((x, idx) => ({
        ...x,
        color: palette[idx % palette.length],
      })),
    [expensesByCategory, palette],
  );
  const totalByCategory = useMemo(
    () => categorySeries.reduce((s, x) => s + clampNonNeg(x.value), 0),
    [categorySeries],
  );
  const isNarrow = windowWidth < 380;

  const filterPanelContent = (
    <View style={styles.panelWrap}>
      <SegmentTabs<PeriodKey>
        value={period}
        options={periodOptions.map((p) => ({ value: p.key, label: p.label }))}
        onChange={setPeriod}
        size="sm"
      />
      <SegmentTabs<StatsTabKey>
        value={tab}
        options={tabOptions.map((x) => ({ value: x.key, label: x.label }))}
        onChange={setTab}
      />
    </View>
  );

  const cardContent = (
    <View>
      {tab === "metrics" ? (
        <View style={styles.section}>
          <View
            style={[
              styles.heroCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Text style={[styles.heroLabel, { color: theme.colors.muted }]}>
              {t("dashboard.stats.metrics.totalExpenses")}
            </Text>
            <Text style={[styles.heroValue, { color: theme.colors.fg }]}>
              {fmtMoney(totals.total, currency)}
            </Text>
            <Text style={[styles.heroMeta, { color: theme.colors.muted }]}>
              {t("dashboard.stats.categories.fuel")}:{" "}
              {fmtMoneyRounded(totals.fuelCost, currency)} ·{" "}
              {t("dashboard.tiles.serviceTitle")}:{" "}
              {fmtMoneyRounded(totals.serviceCost, currency)}
            </Text>
          </View>

          <View style={styles.tilesRow}>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.avgMonthlyFuelCost")}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {Number.isFinite(monthlySeries.avgMonthlyFuelCost)
                  ? fmtMoney(monthlySeries.avgMonthlyFuelCost, currency)
                  : "—"}
              </Text>
            </View>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="speedometer-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.avgFuelConsumption")}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {Number.isFinite(totals.avgConsumptionPer100)
                  ? `${fmtNumber(totals.avgConsumptionPer100, 1)} ${fuelUnitLabel}/100 ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.tilesRow}>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="calculator-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.costPer100")}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {Number.isFinite(totals.costPer100)
                  ? `${fmtNumber(totals.costPer100, 2)} ${currency}/100 ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.avgCostPerLiter", {
                  unit: fuelUnitLabelSingular,
                })}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {Number.isFinite(totals.avgCostPerLiter)
                  ? fmtMoney(totals.avgCostPerLiter, currency)
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.tilesRow}>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="map-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.totalDistance")}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {totals.totalDistance > 0
                  ? `${fmtNumber(totals.totalDistance, 0)} ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
            <View
              style={[
                styles.tile,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                {t("dashboard.stats.metrics.favoriteStation")}
              </Text>
              <Text
                style={[styles.tileValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {favoriteStation
                  ? t(`fuelingForm.stations.${favoriteStation}`)
                  : "—"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {tab === "charts" ? (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.charts.expensesOverTime")}
            </Text>
            <View
              style={[
                styles.chartWrap,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
              key={`line-chart-${period}`}
            >
              <SimpleLineChart
                data={monthlySeries.data}
                width={chartWidth}
                height={220}
                stroke={theme.colors.accent}
                grid={theme.colors.border}
                textColor={theme.colors.muted}
                currency={currency}
              />
              {monthlySeries.data.length === 0 ? (
                <View pointerEvents="none" style={styles.chartEmptyOverlay}>
                  <Text style={[styles.empty, { color: theme.colors.muted }]}>
                    {t("dashboard.stats.empty")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.charts.distanceOverTime")}
            </Text>
            <View
              style={[
                styles.chartWrap,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
              key={`distance-chart-${period}`}
            >
              <SimpleLineChart
                data={monthlyDistanceSeries}
                width={chartWidth}
                height={220}
                stroke={theme.colors.accent}
                grid={theme.colors.border}
                textColor={theme.colors.muted}
                currency={currency}
                yFormat="number"
                yUnit={distanceUnit}
              />
              {monthlyDistanceSeries.length === 0 ? (
                <View pointerEvents="none" style={styles.chartEmptyOverlay}>
                  <Text style={[styles.empty, { color: theme.colors.muted }]}>
                    {t("dashboard.stats.empty")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.charts.expensesByCategory")}
            </Text>
            <View key={`pie-chart-${period}`}>
              <View
                style={[
                  styles.chartWrap,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <SimplePieChart
                  data={categorySeries.map((c) => ({
                    label: c.label,
                    value: c.value,
                  }))}
                  size={Math.min(chartWidth - 40, isNarrow ? 200 : 240)}
                  colors={categorySeries.map((c) => c.color)}
                />
                {categorySeries.length === 0 ? (
                  <View pointerEvents="none" style={styles.chartEmptyOverlay}>
                    <Text style={[styles.empty, { color: theme.colors.muted }]}>
                      {t("dashboard.stats.empty")}
                    </Text>
                  </View>
                ) : null}
              </View>
              {categorySeries.length > 0 ? (
                <View style={styles.legend}>
                  {categorySeries.map((c) => (
                    <View key={c.key} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, { backgroundColor: c.color }]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.legendLabel,
                            { color: theme.colors.fg },
                          ]}
                          numberOfLines={1}
                        >
                          {c.label}
                        </Text>
                      </View>
                      <View style={styles.legendValueWrap}>
                        <Text
                          style={[
                            styles.legendMoney,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {fmtMoney(c.value, currency)}
                        </Text>
                        <Text
                          style={[
                            styles.legendPct,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {fmtPct(
                            totalByCategory > 0
                              ? (c.value / totalByCategory) * 100
                              : Number.NaN,
                          )}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        </>
      ) : null}

      {tab === "other" ? (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.oilChange")}
            </Text>
            <View
              style={[
                styles.infoCard,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.lastOilChangeDate")}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {lastOilChangeDateLabel}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="speedometer-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.lastOilChangeMileage")}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {lastOilChangeMileageLabel}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="repeat-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.oilIntervalAvg", { unit: distanceUnit })}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {oilIntervalAvgKmLabel}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.oilIntervalAvgMonths")}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {oilIntervalAvgMonthsLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.insuranceAndInspection")}
            </Text>
            <View
              style={[
                styles.infoCard,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.insuranceValidUntil")}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {insuranceValidUntilLabel}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text
                  style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                >
                  {t("dashboard.stats.inspectionValidUntil")}
                </Text>
                <Text style={[styles.infoRowValue, { color: theme.colors.fg }]}>
                  {inspectionValidUntilLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.fittedWheelsAndTires")}
            </Text>
            <View
              style={[
                styles.wheelCard,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.wheelSection}>
                <View style={styles.infoRow}>
                  <TireIcon size={18} color={theme.colors.muted} />
                  <Text
                    style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                  >
                    {t("dashboard.stats.currentTire")}
                  </Text>
                </View>
                {fittedTires.length === 0 ? (
                  <View style={styles.fittedSetRow}>
                    <Text
                      style={[
                        styles.fittedSetText,
                        { color: theme.colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      —
                    </Text>
                  </View>
                ) : (
                  fittedTires.map((tire) => (
                    <View key={tire.id} style={styles.fittedSetRow}>
                      <Text
                        style={[
                          styles.fittedSetText,
                          { color: theme.colors.fg },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {`${formatTireDimensions(
                          tire.width_mm,
                          tire.aspect_ratio,
                          tire.diameter_inch,
                        )} · ${(tire.name ?? "").trim() || "—"}`}
                      </Text>
                    </View>
                  ))
                )}
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              <View style={styles.wheelSection}>
                <View style={styles.infoRow}>
                  <RimIcon size={18} color={theme.colors.muted} />
                  <Text
                    style={[styles.infoRowLabel, { color: theme.colors.muted }]}
                  >
                    {t("dashboard.stats.currentWheel")}
                  </Text>
                </View>
                {fittedWheels.length === 0 ? (
                  <View style={styles.fittedSetRow}>
                    <Text
                      style={[
                        styles.fittedSetText,
                        { color: theme.colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      —
                    </Text>
                  </View>
                ) : (
                  fittedWheels.map((wheel) => (
                    <View key={wheel.id} style={styles.fittedSetRow}>
                      <Text
                        style={[
                          styles.fittedSetText,
                          { color: theme.colors.fg },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {`${formatWheelDimensions(
                          wheel.width_inch,
                          wheel.diameter_inch,
                        )} · ${(wheel.name ?? "").trim() || "—"}`}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
      showShopIcon={!isPremium}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <ContentHeader
          title={t("dashboard.stats.title")}
          filterPanel={filterPanelContent}
        />
        {cardContent}
      </ScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    panelWrap: {
      gap: theme.spacing.xs,
    },
    loading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    heroCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    heroLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    heroValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.largeTitle,
    },
    heroMeta: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    tilesRow: { flexDirection: "row", gap: theme.spacing.xs },
    tile: {
      flex: 1,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    tileLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    tileValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
    },
    section: { paddingBottom: theme.spacing.md, gap: theme.spacing.xs },
    sectionTitle: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    empty: { fontSize: theme.typography.small },
    chartWrap: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    chartEmptyOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    legend: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      width: "100%",
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    legendDot: {
      width: theme.spacing.sm - 2,
      height: theme.spacing.sm - 2,
      borderRadius: 999,
    },
    legendLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    legendValueWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    legendMoney: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    legendPct: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
    infoCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    infoRowLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      flex: 1,
      minWidth: 0,
    },
    infoRowValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      textAlign: "right",
    },
    wheelCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
    },
    wheelSection: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    divider: { height: 1, width: "100%" },
    fittedSetRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    fittedSetText: {
      flex: 1,
      minWidth: 0,
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
    },
  });
