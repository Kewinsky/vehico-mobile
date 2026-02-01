import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, {
  Circle,
  Line as SvgLine,
  Path,
  Polyline,
  Text as SvgText,
} from "react-native-svg";

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
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useTheme } from "../ThemeProvider";
import { toastError } from "../toast/toast";
import { LoadingIndicator } from "./LoadingIndicator";

type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";

type Props = {
  vehicleId: string;
  period: PeriodKey;
};

type XY = { x: string; y: number };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function monthKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function parseDateLoose(input: string): Date | null {
  // Accepts YYYY-MM-DD or full ISO.
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
  // Special case for zero
  if (v === 0) {
    return `0 ${currency}`;
  }
  // Round to nearest integer if value is >= 10, otherwise show 1 decimal
  if (v >= 10) {
    return `${Math.round(v)} ${currency}`;
  }
  return `${v.toFixed(1)} ${currency}`;
}

// Calculate nice rounded max value for Y-axis
function niceMaxValue(max: number): number {
  if (max <= 0) return 100;

  // Find the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;

  // Round up to a nice number (1, 2, 5, 10)
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
}

// Round a number to a nice value (multiple of 1, 2, 5, 10, 20, 50, 100, etc.)
function roundToNice(value: number): number {
  if (value <= 0) return 0;

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;

  // Round to nearest nice number (1, 2, 5, 10)
  let niceNormalized: number;
  if (normalized <= 1.5) niceNormalized = 1;
  else if (normalized <= 3.5) niceNormalized = 2;
  else if (normalized <= 7.5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
}

// Generate nice tick values
function generateNiceTicks(max: number): number[] {
  const niceMax = niceMaxValue(max);
  const ticks: number[] = [0];

  // Determine step size - try to get 4-5 ticks
  const targetTicks = 5;
  const rawStep = niceMax / targetTicks;
  const niceStep = roundToNice(rawStep);

  // Generate ticks with nice step
  for (let i = niceStep; i <= niceMax; i += niceStep) {
    ticks.push(i);
  }

  // If we have too few ticks, add more
  if (ticks.length < 4) {
    const smallerStep = niceStep / 2;
    ticks.length = 1; // Keep 0
    for (let i = smallerStep; i <= niceMax; i += smallerStep) {
      ticks.push(i);
    }
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
  // Responsive padding - adjust based on available width
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
      {xTicks.map((tick, i) => (
        <SvgLine
          key={`grid-x-${i}`}
          x1={tick.x}
          y1={paddingTop}
          x2={tick.x}
          y2={paddingTop + plotH}
          stroke={grid}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      ))}
      <SvgLine
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + plotH}
        stroke={grid}
        strokeWidth={1}
      />
      <SvgLine
        x1={paddingLeft}
        y1={paddingTop + plotH}
        x2={paddingLeft + plotW}
        y2={paddingTop + plotH}
        stroke={grid}
        strokeWidth={1}
      />
      {yTicks.map((tick, i) => (
        <SvgLine
          key={`y-${i}`}
          x1={paddingLeft - 4}
          y1={tick.y}
          x2={paddingLeft}
          y2={tick.y}
          stroke={grid}
          strokeWidth={1}
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
        <SvgLine
          key={`x-${i}`}
          x1={tick.x}
          y1={paddingTop + plotH}
          x2={tick.x}
          y2={paddingTop + plotH + 4}
          stroke={grid}
          strokeWidth={1}
        />
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
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
      />
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

  // Start from top (-90deg)
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

export function StatisticsCard({ vehicleId, period }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();

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
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<ServiceEntry[]>([]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);

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
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
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
  }, [isFocused, t, vehicleId]);

  const currentTire = tires.find((x) => x.is_currently_fitted) ?? null;
  const currentWheel = wheels.find((x) => x.is_currently_fitted) ?? null;

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

    // Calculate start month based on period
    let startMonthStr: string | null = null;
    if (period !== "all") {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-11

      let monthsBack = 0;
      if (period === "1m") monthsBack = 0; // Current month only
      else if (period === "3m") monthsBack = 2; // Current + 2 previous
      else if (period === "6m") monthsBack = 5; // Current + 5 previous
      else if (period === "1y") monthsBack = 11; // Current + 11 previous

      const startDate = new Date(currentYear, currentMonth - monthsBack, 1);
      startMonthStr = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1,
      ).padStart(2, "0")}`;
    }

    const serviceIn = service.filter((x) => {
      const entryDateStr = x.service_date.slice(0, 10); // YYYY-MM-DD
      // Never show future dates
      if (entryDateStr > todayStr) return false;

      if (period === "all") return true;

      // Check if entry is in the month range
      const entryMonthStr = entryDateStr.slice(0, 7); // YYYY-MM
      // Entry must be between startMonth and currentMonth (inclusive)
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });

    const fuelingIn = fueling.filter((x) => {
      const entryDateStr = x.date; // Already YYYY-MM-DD
      // Never show future dates
      if (entryDateStr > todayStr) return false;

      if (period === "all") return true;

      // Check if entry is in the month range
      const entryMonthStr = entryDateStr.slice(0, 7); // YYYY-MM
      // Entry must be between startMonth and currentMonth (inclusive)
      return (
        entryMonthStr >= startMonthStr! && entryMonthStr <= currentMonthStr
      );
    });

    return { service: serviceIn, fueling: fuelingIn };
  }, [period, fueling, service]);

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

    // Get all categories with values
    const items = Object.entries(acc)
      .map(([key, value]) => ({ key, value: value ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value); // Sort from highest to lowest

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

    const keys = Object.keys(byMonth).sort();
    const data = keys.map((k) => ({ x: k, y: byMonth[k] ?? 0 }));

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
  }, [filtered.service, filtered.fueling, totals.fuelCost]);

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
    const keys = Object.keys(byMonth).sort();
    return keys.map((k) => ({ x: k, y: byMonth[k] ?? 0 }));
  }, [filtered.fueling]);

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

  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Chart width with proper margins to fit in card
  // Reduce width slightly to ensure labels fit properly
  const cardPadding = theme.spacing.md * 2; // Left + right padding of card
  const chartWidth = Math.max(
    280,
    windowWidth - cardPadding - theme.spacing.md * 2 - 20,
  );

  const palette = useMemo(
    () => [
      theme.colors.accent, // #FFB803 - yellow (for fuel)
      "#10B981", // emerald-500 - green
      "#EC4899", // pink-500 - pink (replaces amber)
      "#3B82F6", // blue-500 - blue (replaces orange)
      "#A78BFA", // violet-400 - violet
      "#06B6D4", // cyan-500 - cyan
      "#EF4444", // red-500 - red
    ],
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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <LoadingIndicator />
        </View>
      ) : (
        <>
          {/* SECTION 1: Metrics – summary of expenses, fuel, distance */}
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.totalExpenses")}
              </Text>
              <Text style={styles.metricValue}>
                {fmtMoney(totals.total, currency)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.avgMonthlyFuelCost")}
              </Text>
              <Text style={styles.metricValue}>
                {Number.isFinite(monthlySeries.avgMonthlyFuelCost)
                  ? fmtMoney(monthlySeries.avgMonthlyFuelCost, currency)
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.avgFuelConsumption")}
              </Text>
              <Text style={styles.metricValue}>
                {Number.isFinite(totals.avgConsumptionPer100)
                  ? `${fmtNumber(
                      totals.avgConsumptionPer100,
                      1,
                    )} ${fuelUnitLabel}/100 ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.costPer100")}
              </Text>
              <Text style={styles.metricValue}>
                {Number.isFinite(totals.costPer100)
                  ? `${fmtNumber(
                      totals.costPer100,
                      2,
                    )} ${currency}/100 ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.totalDistance")}
              </Text>
              <Text style={styles.metricValue}>
                {totals.totalDistance > 0
                  ? `${fmtNumber(totals.totalDistance, 0)} ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.totalFuel")}
              </Text>
              <Text style={styles.metricValue}>
                {totals.totalFuel > 0
                  ? `${fmtNumber(totals.totalFuel, 1)} ${fuelUnitLabel}`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.favoriteStation")}
              </Text>
              <Text style={styles.metricValue}>
                {favoriteStation
                  ? t(`fuelingForm.stations.${favoriteStation}`)
                  : "—"}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {t("dashboard.stats.metrics.avgCostPerLiter", {
                  unit: fuelUnitLabelSingular,
                })}
              </Text>
              <Text style={styles.metricValue}>
                {Number.isFinite(totals.avgCostPerLiter)
                  ? fmtMoney(totals.avgCostPerLiter, currency)
                  : "—"}
              </Text>
            </View>
          </View>

          {/* SECTION 2: Charts: expenses over time (linear) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("dashboard.stats.charts.expensesOverTime")}
            </Text>
            {monthlySeries.data.length > 0 ? (
              <View style={styles.chartWrap} key={`line-chart-${period}`}>
                <SimpleLineChart
                  data={monthlySeries.data}
                  width={chartWidth}
                  height={220}
                  stroke={theme.colors.accent}
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  currency={currency}
                />
              </View>
            ) : (
              <Text style={styles.empty}>{t("dashboard.stats.empty")}</Text>
            )}
          </View>

          {/* SECTION 3: Charts: distance over time (linear) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("dashboard.stats.charts.distanceOverTime")}
            </Text>
            {monthlyDistanceSeries.length > 0 ? (
              <View style={styles.chartWrap} key={`distance-chart-${period}`}>
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
              </View>
            ) : (
              <Text style={styles.empty}>{t("dashboard.stats.empty")}</Text>
            )}
          </View>

          {/* SECTION 4: Charts: expenses by category (pie) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("dashboard.stats.charts.expensesByCategory")}
            </Text>
            {expensesByCategory.length > 0 ? (
              <View key={`pie-chart-${period}`}>
                <View style={styles.chartWrap}>
                  <SimplePieChart
                    data={categorySeries.map((c) => ({
                      label: c.label,
                      value: c.value,
                    }))}
                    size={Math.min(chartWidth - 40, isNarrow ? 200 : 240)}
                    colors={categorySeries.map((c) => c.color)}
                  />
                </View>

                <View style={styles.legend}>
                  {categorySeries.map((c) => (
                    <View key={c.key} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, { backgroundColor: c.color }]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendLabel} numberOfLines={1}>
                          {c.label}
                        </Text>
                      </View>
                      <Text style={styles.legendValue}>
                        {fmtPct(
                          totalByCategory > 0
                            ? (c.value / totalByCategory) * 100
                            : Number.NaN,
                        )}{" "}
                        · {fmtMoney(c.value, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.empty}>{t("dashboard.stats.empty")}</Text>
            )}
          </View>

          {/* SECTION 5: Wymiana oleju (ostatnia + interwały) */}
          {(lastOilChange != null ||
            Number.isFinite(oilIntervals.avgKm) ||
            Number.isFinite(oilIntervals.avgMonths)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("dashboard.stats.oilChange")}
              </Text>
              <View style={styles.infoCard}>
                {lastOilChange != null && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoRowLabel}>
                        {t("dashboard.stats.lastOilChangeDate")}
                      </Text>
                      <Text style={styles.infoRowValue}>
                        {lastOilChange.service_date.slice(0, 10)}
                      </Text>
                    </View>
                    {lastOilChange.mileage != null && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoRowLabel}>
                          {t("dashboard.stats.lastOilChangeMileage")}
                        </Text>
                        <Text style={styles.infoRowValue}>
                          {fmtNumber(lastOilChange.mileage, 0)} {distanceUnit}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                {Number.isFinite(oilIntervals.avgKm) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.oilIntervalAvg", {
                        unit: distanceUnit,
                      })}
                    </Text>
                    <Text style={styles.infoRowValue}>
                      {fmtNumber(oilIntervals.avgKm, 0)} {distanceUnit}
                    </Text>
                  </View>
                )}
                {Number.isFinite(oilIntervals.avgMonths) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.oilIntervalAvgMonths")}
                    </Text>
                    <Text style={styles.infoRowValue}>
                      {fmtNumber(oilIntervals.avgMonths, 1)}{" "}
                      {t("dashboard.stats.months")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* SECTION 6: Ubezpieczenie i przegląd */}
          {(vehicle?.insurance_valid_until != null ||
            vehicle?.inspection_valid_until != null) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("dashboard.stats.insuranceAndInspection")}
              </Text>
              <View style={styles.infoCard}>
                {vehicle?.insurance_valid_until != null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.insuranceValidUntil")}
                    </Text>
                    <Text style={styles.infoRowValue}>
                      {vehicle.insurance_valid_until}
                    </Text>
                  </View>
                )}
                {vehicle?.inspection_valid_until != null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.inspectionValidUntil")}
                    </Text>
                    <Text style={styles.infoRowValue}>
                      {vehicle.inspection_valid_until}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* SECTION 7: Założone felgi i opony */}
          {(currentTire != null || currentWheel != null) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("dashboard.stats.fittedWheelsAndTires")}
              </Text>
              <View style={styles.infoCard}>
                {currentTire != null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.currentTire")}
                    </Text>
                    <View style={styles.infoRowValueWrap}>
                      <Text
                        style={styles.infoRowValue}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {currentTire.name} ·{" "}
                        {formatTireDimensions(
                          currentTire.width_mm,
                          currentTire.aspect_ratio,
                          currentTire.diameter_inch,
                        )}{" "}
                        · {t(`tireForm.types.${currentTire.tire_type}`)}
                      </Text>
                    </View>
                  </View>
                )}
                {currentWheel != null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>
                      {t("dashboard.stats.currentWheel")}
                    </Text>
                    <View style={styles.infoRowValueWrap}>
                      <Text
                        style={styles.infoRowValue}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {currentWheel.name} ·{" "}
                        {formatWheelDimensions(
                          currentWheel.width_inch,
                          currentWheel.diameter_inch,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.md - 2,
    },
    loading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.lg - 6,
    },
    metricsRow: { flexDirection: "row", gap: theme.spacing.sm },
    metric: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      gap: theme.spacing.sm / 2,
    },
    metricLabel: {
      color: theme.colors.muted,
      fontWeight: "800",
      fontSize: theme.typography.xs,
    },
    metricValue: {
      color: theme.colors.fg,
      fontWeight: "900",
      fontSize: theme.typography.small,
    },
    section: { gap: theme.spacing.sm - 2 },
    sectionTitle: { color: theme.colors.fg, fontWeight: "900" },
    empty: { color: theme.colors.muted, fontWeight: "700" },
    infoCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      gap: theme.spacing.sm / 2,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    infoRowLabel: {
      color: theme.colors.muted,
      fontWeight: "700",
      fontSize: theme.typography.small,
      flexShrink: 0,
    },
    infoRowValueWrap: {
      flex: 1,
      minWidth: 0,
    },
    infoRowValue: {
      color: theme.colors.fg,
      fontWeight: "700",
      fontSize: theme.typography.small,
      textAlign: "right",
    },
    chartWrap: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    pieBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: 12,
      padding: theme.spacing.xs,
      alignSelf: "center",
    },
    legend: {
      gap: theme.spacing.sm - 2,
      paddingTop: theme.spacing.sm,
      width: "100%",
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm - 2,
    },
    legendDot: {
      width: theme.spacing.sm - 2,
      height: theme.spacing.sm - 2,
      borderRadius: 999,
    },
    legendLabel: {
      color: theme.colors.fg,
      fontWeight: "800",
      fontSize: theme.typography.xs,
    },
    legendValue: {
      color: theme.colors.muted,
      fontWeight: "800",
      fontSize: theme.typography.xs,
    },
  });
