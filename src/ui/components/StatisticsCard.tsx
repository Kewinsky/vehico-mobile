import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import type {
  FuelingEntry,
  ServiceEntry,
  ServiceEntryCategory,
} from "../../types/domain";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useTheme } from "../ThemeProvider";
import { toastError } from "../toast/toast";

type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";

type Props = {
  vehicleId: string;
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
  endAngle: number
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

function SimpleLineChart({
  data,
  width,
  height,
  stroke,
  grid,
  textColor,
  currency,
}: {
  data: XY[];
  width: number;
  height: number;
  stroke: string;
  grid: string;
  textColor: string;
  currency: string;
}) {
  // Responsive padding - adjust based on available width
  // More padding for Y-axis labels (to fit full currency values)
  const paddingLeft = Math.max(65, Math.min(75, width * 0.15)); // 15% of width, min 65, max 75
  const paddingRight = 20; // More space for rightmost X-axis labels (dates)
  const paddingTop = 10;
  const paddingBottom = 35; // More space for X-axis labels (dates)
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

  // Generate Y-axis ticks with nice rounded values
  const tickValues = generateNiceTicks(maxY);
  const yTicks = tickValues.map((value) => {
    const y = paddingTop + (1 - value / niceMaxY) * plotH;
    return { value, y };
  });

  // Generate X-axis ticks (show first, middle, last, and some in between if many points)
  const xTicks: Array<{ x: number; label: string; index: number }> = [];
  if (data.length > 0) {
    if (data.length <= 5) {
      // Show all points
      points.forEach((p, i) => {
        xTicks.push({ x: p.x, label: p.label.replace("-", "/"), index: i });
      });
    } else {
      // Show first, last, and some in between
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

  return (
    <Svg width={w} height={h}>
      {/* Grid lines - horizontal */}
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
          opacity={0.5}
        />
      ))}

      {/* Grid lines - vertical */}
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
          opacity={0.5}
        />
      ))}

      {/* Y-axis */}
      <SvgLine
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + plotH}
        stroke={grid}
        strokeWidth={1}
      />
      {/* X-axis */}
      <SvgLine
        x1={paddingLeft}
        y1={paddingTop + plotH}
        x2={paddingLeft + plotW}
        y2={paddingTop + plotH}
        stroke={grid}
        strokeWidth={1}
      />

      {/* Y-axis ticks */}
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

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => {
        const formattedValue = fmtMoneyRounded(tick.value, currency);
        return (
          <SvgText
            key={`y-label-${i}`}
            x={paddingLeft - 10}
            y={tick.y + 4}
            fontSize={9}
            fill={textColor}
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {formattedValue}
          </SvgText>
        );
      })}

      {/* X-axis ticks */}
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

      {/* X-axis labels */}
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

      {/* Line chart */}
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

export function StatisticsCard({ vehicleId }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";

  const [period, setPeriod] = useState<PeriodKey>("3m");
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceEntry[]>([]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);

  useEffect(() => {
    if (!isFocused) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [s, f] = await Promise.all([
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
        ]);
        if (!alive) return;
        setService(s);
        setFueling(f);
      } catch (err: any) {
        toastError(t("common.error"), err?.message ?? String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isFocused, t, vehicleId]);

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
        startDate.getMonth() + 1
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
      0
    );
    const fuelCost = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.fuel_cost ?? 0),
      0
    );
    const totalDistance = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.distance ?? 0),
      0
    );
    const totalFuel = filtered.fueling.reduce(
      (sum, x) => sum + Number(x.fuel_amount ?? 0),
      0
    );
    const total = serviceCost + fuelCost;
    const avgConsumptionPer100 =
      totalDistance > 0 ? (totalFuel / totalDistance) * 100 : Number.NaN;
    const costPer100 =
      totalDistance > 0 ? (total / totalDistance) * 100 : Number.NaN;
    return {
      serviceCost,
      fuelCost,
      total,
      totalDistance,
      totalFuel,
      avgConsumptionPer100,
      costPer100,
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

  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Chart width with proper margins to fit in card
  // Reduce width slightly to ensure labels fit properly
  const cardPadding = theme.spacing.md * 2; // Left + right padding of card
  const chartWidth = Math.max(
    280,
    windowWidth - cardPadding - theme.spacing.md * 2 - 20
  );

  const palette = useMemo(
    () => [
      theme.colors.accent,
      "#10B981", // emerald-500
      "#F59E0B", // amber-500
      "#A78BFA", // violet-400
      "#F97316", // orange-500
      "#06B6D4", // cyan-500
      "#EF4444", // red-500
    ],
    [theme.colors.accent]
  );

  const periodOptions: { key: PeriodKey; label: string }[] = useMemo(
    () => [
      { key: "1m", label: t("dashboard.stats.periods.1m") },
      { key: "3m", label: t("dashboard.stats.periods.3m") },
      { key: "6m", label: t("dashboard.stats.periods.6m") },
      { key: "1y", label: t("dashboard.stats.periods.1y") },
      { key: "all", label: t("dashboard.stats.periods.all") },
    ],
    [t]
  );

  const categorySeries = useMemo(
    () =>
      expensesByCategory.map((x, idx) => ({
        ...x,
        color: palette[idx % palette.length],
      })),
    [expensesByCategory, palette]
  );

  const totalByCategory = useMemo(
    () => categorySeries.reduce((s, x) => s + clampNonNeg(x.value), 0),
    [categorySeries]
  );

  const isNarrow = windowWidth < 380;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("dashboard.stats.title")}</Text>
        <View style={styles.periodRow}>
          {periodOptions.map((p) => {
            const active = p.key === period;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={({ pressed }) => [
                  styles.chip,
                  active ? styles.chipActive : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <>
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
                      1
                    )} ${fuelUnit}/100 ${distanceUnit}`
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
                      2
                    )} ${currency}/100 ${distanceUnit}`
                  : "—"}
              </Text>
            </View>
          </View>

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
                            : Number.NaN
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
        </>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 14,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    title: { color: theme.colors.fg, fontSize: 16, fontWeight: "900" },
    periodRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    chipActive: {
      backgroundColor: theme.colors.fg,
      borderColor: theme.colors.fg,
    },
    chipPressed: { opacity: 0.92 },
    chipText: { color: theme.colors.fg, fontSize: 12, fontWeight: "800" },
    chipTextActive: { color: theme.colors.bg },
    loading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
      gap: 10,
    },
    loadingText: { color: theme.colors.muted, fontWeight: "700" },
    metricsRow: { flexDirection: "row", gap: 12 },
    metric: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    metricLabel: { color: theme.colors.muted, fontWeight: "800", fontSize: 12 },
    metricValue: { color: theme.colors.fg, fontWeight: "900", fontSize: 14 },
    section: { gap: 10 },
    sectionTitle: { color: theme.colors.fg, fontWeight: "900" },
    empty: { color: theme.colors.muted, fontWeight: "700" },
    chartWrap: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    pieBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      borderRadius: 12,
      padding: 10,
      alignSelf: "center",
    },
    legend: { gap: 10, paddingTop: 12, width: "100%" },
    legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    legendDot: { width: 10, height: 10, borderRadius: 999 },
    legendLabel: { color: theme.colors.fg, fontWeight: "800", fontSize: 12 },
    legendValue: { color: theme.colors.muted, fontWeight: "800", fontSize: 12 },
  });
