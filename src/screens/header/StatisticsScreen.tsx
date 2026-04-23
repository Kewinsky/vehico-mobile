import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
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
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type {
  FuelingEntry,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
  VehicleTire,
  VehicleWheel,
  Workshop,
} from "../../types/domain";
import { SERVICE_CATEGORY_COLORS } from "../../ui/theme/serviceCategoryColors";
import { SERVICE_CATEGORY_ICON_BACKGROUND } from "../../ui/theme/serviceCategoryColors";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import type { AppTheme } from "../../ui/theme";
import { ServiceItem } from "../../ui/components/list/ServiceItem";

type ScreenProps = NativeStackScreenProps<AppStackParamList, "Statistics">;
type EmbeddedProps = {
  vehicleId: string;
  embedded: true;
};
type Props = ScreenProps | EmbeddedProps;

function isEmbeddedProps(props: Props): props is EmbeddedProps {
  return "embedded" in props && props.embedded === true;
}

function StatTile({
  icon,
  iconComponent,
  label,
  valueMain,
  valueSuffix,
  theme,
  styles,
  fullWidth,
  onPress,
  accessibilityHint,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconComponent?: ReactNode;
  label: string;
  valueMain: string;
  valueSuffix?: string;
  theme: AppTheme;
  styles: ReturnType<typeof makeStyles>;
  fullWidth?: boolean;
  onPress?: () => void;
  /** Hint for screen readers when tile is pressable (e.g. "Tap to switch between date and mileage"). */
  accessibilityHint?: string;
}) {
  const tileContent = (
    <>
      <View style={styles.tileTitleRow}>
        {iconComponent ? (
          iconComponent
        ) : icon ? (
          <Ionicons name={icon} size={24} color={theme.colors.accent} />
        ) : null}
        <Text style={[styles.tileLabel, { color: theme.colors.accent }]}>
          {label}
        </Text>
      </View>
      <View style={styles.tileValueRow}>
        <Text
          style={[styles.tileValueMain, { color: theme.colors.fg }]}
          numberOfLines={1}
        >
          {valueMain}
        </Text>
        {valueSuffix != null && valueSuffix !== "" ? (
          <Text
            style={[styles.tileValueSuffix, { color: theme.colors.muted }]}
            numberOfLines={1}
          >
            {" "}
            {valueSuffix}
          </Text>
        ) : null}
        {onPress ? (
          <Ionicons
            name="swap-horizontal"
            size={18}
            color={theme.colors.muted}
            style={styles.tilePressableIcon}
          />
        ) : null}
      </View>
    </>
  );
  const tileStyle = [
    styles.tile,
    fullWidth && styles.tileFullWidth,
    { backgroundColor: theme.colors.card },
  ];
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...tileStyle, pressed && { opacity: 0.7 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      >
        {tileContent}
      </Pressable>
    );
  }
  return <View style={tileStyle}>{tileContent}</View>;
}
type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";
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
  return `${v.toFixed(0)} ${currency}`;
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
/** Format month count for display: integer without decimal (e.g. "2" not "2.0"). */
function fmtMonths(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}
/** Format chart Y axis number without decimals when integer (e.g. 100 not 100.0). */
function fmtChartNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return Math.round(value).toString();
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}
/** Format chart Y axis label: values >= 1000 as "1k", "2k", "1.5k"; below 1000 as number. */
function formatChartYAxisLabel(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  if (Number.isInteger(value)) return Math.round(value).toString();
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}
/** Format month key "2025-01" to short month name "Jan." / "Sty." for chart X axis. */
function formatChartMonthKey(key: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key.replace("-", "/");
  const month = parseInt(m[2], 10) - 1;
  const short = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(2000, month, 1),
  );
  const withDot = short.endsWith(".") ? short : `${short}.`;
  return withDot.charAt(0).toUpperCase() + withDot.slice(1);
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

const CHART_AXIS_FONT_SIZE = 13;
const CHART_LINE_HEIGHT = 260;
const CHART_BAR_HEIGHT = 260;
const CHART_Y_AXIS_WIDTH = 44;
const CHART_PLOT_PADDING_LEFT = 8;
const CHART_PLOT_PADDING_RIGHT = 16;
const CHART_PLOT_PADDING_TOP = 16;
const CHART_PLOT_PADDING_BOTTOM = 44;
const CHART_LINE_START_INSET = 14;
const CHART_ITEM_MIN_WIDTH = 72;
const CHART_MIN_EXTRA_WIDTH = 60;
const OIL_CHANGE_INTERVAL_KM = 10_000;
const OIL_CHANGE_INTERVAL_DAYS = 365;
type ChartYTick = { value: number; y: number };

function getChartScale(values: number[], height: number) {
  const maxY = Math.max(1, ...values.map((value) => clampNonNeg(value)));
  const niceMaxY = niceMaxValue(maxY);
  const plotH = height - CHART_PLOT_PADDING_TOP - CHART_PLOT_PADDING_BOTTOM;
  const tickValues = generateNiceTicks(maxY);
  const yTicks: ChartYTick[] = tickValues.map((value) => ({
    value,
    y: CHART_PLOT_PADDING_TOP + (1 - value / niceMaxY) * plotH,
  }));
  return { maxY, niceMaxY, plotH, yTicks };
}

function getScrollableChartWidth(
  itemCount: number,
  minWidth: number,
  itemWidth = CHART_ITEM_MIN_WIDTH,
) {
  return Math.max(
    minWidth,
    Math.max(itemCount, 1) * itemWidth + CHART_MIN_EXTRA_WIDTH,
  );
}

function ChartYAxis({
  height,
  yTicks,
  textColor,
  grid,
  formatYLabel,
}: {
  height: number;
  yTicks: ChartYTick[];
  textColor: string;
  grid: string;
  formatYLabel: (value: number) => string;
}) {
  return (
    <Svg width={CHART_Y_AXIS_WIDTH} height={height}>
      <SvgLine
        x1={CHART_Y_AXIS_WIDTH - 1}
        y1={CHART_PLOT_PADDING_TOP}
        x2={CHART_Y_AXIS_WIDTH - 1}
        y2={height - CHART_PLOT_PADDING_BOTTOM}
        stroke={grid}
        strokeWidth={1}
      />
      {yTicks.map((tick, i) => (
        <SvgText
          key={`y-axis-label-${i}`}
          x={CHART_Y_AXIS_WIDTH - 12}
          y={tick.y + 5}
          fontSize={CHART_AXIS_FONT_SIZE}
          fill={textColor}
          textAnchor="end"
          alignmentBaseline="middle"
        >
          {formatYLabel(tick.value)}
        </SvgText>
      ))}
    </Svg>
  );
}

function SimpleBarChart({
  data,
  width,
  height,
  niceMaxY,
  yTicks,
  fill,
  grid,
  textColor,
  formatXLabel,
}: {
  data: XY[];
  width: number;
  height: number;
  niceMaxY: number;
  yTicks: ChartYTick[];
  fill: string;
  grid: string;
  textColor: string;
  formatXLabel?: (key: string) => string;
}) {
  const w = width;
  const h = height;
  const plotW = w - CHART_PLOT_PADDING_LEFT - CHART_PLOT_PADDING_RIGHT;
  const plotH = h - CHART_PLOT_PADDING_TOP - CHART_PLOT_PADDING_BOTTOM;
  const barCount = data.length || 1;
  const minBarGap = 6;
  const maxBarWidth = 48;
  const totalBarWidth = barCount * maxBarWidth + (barCount - 1) * minBarGap;
  let barGap = minBarGap;
  let barWidth = maxBarWidth;
  let startX = CHART_PLOT_PADDING_LEFT;
  if (barCount === 1) {
    startX = CHART_PLOT_PADDING_LEFT + (plotW - barWidth) / 2;
  } else if (totalBarWidth <= plotW) {
    barGap = (plotW - barCount * barWidth) / (barCount - 1);
  } else {
    barWidth = Math.max(6, (plotW - (barCount - 1) * barGap) / barCount);
  }
  const bars = data.map((d, i) => {
    const barX = startX + i * (barWidth + barGap);
    const barHeight = (clampNonNeg(d.y) / niceMaxY) * plotH;
    const barY = CHART_PLOT_PADDING_TOP + plotH - barHeight;
    return {
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
      label: formatXLabel ? formatXLabel(d.x) : d.x.replace("-", "/"),
      value: d.y,
    };
  });
  const xTicks = bars.map((b, i) => ({
    x: b.x + b.width / 2,
    label: b.label,
    index: i,
  }));
  return (
    <Svg width={w} height={h}>
      {yTicks.map((tick, i) => (
        <SvgLine
          key={`grid-y-${i}`}
          x1={0}
          y1={tick.y}
          x2={w}
          y2={tick.y}
          stroke={grid}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      ))}
      {bars.map((bar, i) => (
        <Rect
          key={`bar-${i}`}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          fill={fill}
          rx={2}
        />
      ))}
      {xTicks.map((tick, i) => (
        <SvgText
          key={`x-label-${i}`}
          x={tick.x}
          y={CHART_PLOT_PADDING_TOP + plotH + 26}
          fontSize={CHART_AXIS_FONT_SIZE}
          fill={textColor}
          textAnchor="middle"
          alignmentBaseline="hanging"
        >
          {tick.label}
        </SvgText>
      ))}
    </Svg>
  );
}

function SimpleLineChart({
  data,
  width,
  height,
  minY,
  maxY,
  yTicks,
  stroke,
  grid,
  textColor,
  formatXLabel,
}: {
  data: XY[];
  width: number;
  height: number;
  minY: number;
  maxY: number;
  yTicks: ChartYTick[];
  stroke: string;
  grid: string;
  textColor: string;
  formatXLabel?: (key: string) => string;
}) {
  const w = width;
  const h = height;
  const plotW = w - CHART_PLOT_PADDING_LEFT - CHART_PLOT_PADDING_RIGHT;
  const plotH = h - CHART_PLOT_PADDING_TOP - CHART_PLOT_PADDING_BOTTOM;
  const lineStartX = CHART_PLOT_PADDING_LEFT + CHART_LINE_START_INSET;
  const lineEndX = w - CHART_PLOT_PADDING_RIGHT;
  const linePlotW = Math.max(0, lineEndX - lineStartX);
  const yRange = Math.max(1, maxY - minY);
  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? lineStartX + linePlotW / 2
        : lineStartX + (i / (data.length - 1)) * linePlotW;
    const normalizedY = Math.min(
      1,
      Math.max(0, (clampNonNeg(d.y) - minY) / yRange),
    );
    const y = CHART_PLOT_PADDING_TOP + (1 - normalizedY) * plotH;
    return { x, y, label: d.x, value: d.y };
  });
  const toXLabel = (key: string) =>
    formatXLabel ? formatXLabel(key) : key.replace("-", "/");
  const xTicks: Array<{ x: number; label: string; index: number }> = [];
  if (data.length > 0) {
    points.forEach((p, i) => {
      xTicks.push({ x: p.x, label: toXLabel(p.label), index: i });
    });
  }
  return (
    <Svg width={w} height={h}>
      {yTicks.map((tick, i) => (
        <SvgLine
          key={`grid-y-${i}`}
          x1={0}
          y1={tick.y}
          x2={w}
          y2={tick.y}
          stroke={grid}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      ))}
      {xTicks.map((tick, i) => (
        <SvgText
          key={`x-label-${i}`}
          x={tick.x}
          y={CHART_PLOT_PADDING_TOP + plotH + 26}
          fontSize={CHART_AXIS_FONT_SIZE}
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
          strokeWidth={3}
        />
      ) : null}
      {points.length > 0 ? (
        <>
          <Circle cx={points[0].x} cy={points[0].y} r={4} fill={stroke} />
          <Circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
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
  const {
    isPremium,
    tiresPerVehicleLimit,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanTireId,
    freePlanWheelId,
    refresh: refreshEntitlements,
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
  const [legendShowPercent, setLegendShowPercent] = useState(true);
  const [oilLastChangeShowDate, setOilLastChangeShowDate] = useState(true);
  const [oilAvgIntervalShowMonths, setOilAvgIntervalShowMonths] =
    useState(true);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<ServiceEntry[]>([]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [workshopsById, setWorkshopsById] = useState<Record<string, Workshop>>(
    {},
  );

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";
  const fuelUnitLabel =
    fuelUnit === "liters"
      ? t("dashboard.stats.units.liters")
      : t("dashboard.stats.units.gallons");
  const fuelUnitShort = fuelUnit === "liters" ? "L" : "gal";

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [v, s, f, tiresData, wheelsData, workshops] = await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehicleTires(vehicleId, tireOpts),
          listVehicleWheels(vehicleId, wheelOpts),
          listWorkshops(),
        ]);
        setVehicle(v);
        setService(s);
        setFueling(f);
        setTires(tiresData);
        setWheels(wheelsData);
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
    [vehicleId, t, tireOpts, wheelOpts],
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

  const monthlyDistanceSeries = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const f of filtered.fueling) {
      const d = parseDateLoose(f.date);
      if (!d) continue;
      const k = monthKey(d);
      const dist = Number(f.distance ?? 0);
      byMonth[k] = (byMonth[k] ?? 0) + dist;
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
    ? `${fmtMonths(oilIntervals.avgMonths)} ${t("dashboard.stats.months")}`
    : "—";
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

    const remainingDays = Math.max(
      0,
      Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const remainingKm =
      dueMileage != null && currentMileage != null
        ? Math.max(0, Math.round(dueMileage - currentMileage))
        : null;

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
  const insuranceValidUntilLabel = vehicle?.insurance_valid_until ?? "—";
  const inspectionValidUntilLabel = vehicle?.inspection_valid_until ?? "—";
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

  const renderServiceIcon = useCallback(
    (cat: ServiceEntryCategory) => {
      const color = SERVICE_CATEGORY_COLORS[cat];
      switch (cat) {
        case "maintenance":
          return <Ionicons name="build-outline" size={22} color={color} />;
        case "repair":
          return <Ionicons name="construct-outline" size={22} color={color} />;
        case "inspection":
          return <Ionicons name="search-outline" size={22} color={color} />;
        case "upgrade":
          return (
            <Ionicons name="trending-up-outline" size={22} color={color} />
          );
        case "oil_change":
          return <Ionicons name="water-outline" size={22} color={color} />;
        case "other":
        default:
          return (
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={color}
            />
          );
      }
    },
    [theme.colors.muted],
  );

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

  const chartViewportWidth = Math.max(
    280,
    windowWidth - theme.layout.contentPaddingHorizontal * 2,
  );
  const chartScrollViewportWidth = Math.max(
    0,
    chartViewportWidth - CHART_Y_AXIS_WIDTH,
  );
  const barChartWidth = getScrollableChartWidth(
    monthlySeries.data.length,
    chartScrollViewportWidth,
  );
  const lineChartWidth = getScrollableChartWidth(
    monthlyDistanceSeries.length,
    chartScrollViewportWidth,
  );
  const barChartScale = getChartScale(
    monthlySeries.data.map((item) => item.y),
    CHART_BAR_HEIGHT,
  );
  const lineChartScale = getChartScale(
    monthlyDistanceSeries.map((item) => item.y),
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

  const totalMain =
    totals.total > 0
      ? totals.total >= 10
        ? Math.round(totals.total).toString()
        : totals.total.toFixed(1)
      : "—";
  const fuelMain =
    totals.fuelCost > 0
      ? totals.fuelCost >= 10
        ? Math.round(totals.fuelCost).toString()
        : totals.fuelCost.toFixed(1)
      : "—";
  const serviceMain =
    totals.serviceCost > 0
      ? totals.serviceCost >= 10
        ? Math.round(totals.serviceCost).toString()
        : totals.serviceCost.toFixed(1)
      : "—";

  const oilLifeStatusText = oilLife
    ? `${oilLife.progressPercent}% ${
        oilLife.isOverdue
          ? t("dashboard.stats.statusOverdue")
          : oilLife.isDueSoon
            ? t("dashboard.stats.statusDueSoon")
            : t("dashboard.stats.statusOptimal")
      }`.toUpperCase()
    : "";
  const oilLifeProgressPercent = oilLife
    ? Math.max(0, Math.min(100, oilLife.progressPercent))
    : 0;
  const oilLifeOverlayTextWidthPercent =
    oilLifeProgressPercent > 0 ? 100 / (oilLifeProgressPercent / 100) : 100;

  const cardContent = (
    <View>
      {/* Cost summary split by fuel and service categories. */}
      <View style={styles.section}>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.categories.fuel")}
            valueMain={fuelMain}
            valueSuffix={fuelMain !== "—" ? currency : undefined}
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.tiles.serviceTitle")}
            valueMain={serviceMain}
            valueSuffix={serviceMain !== "—" ? currency : undefined}
          />
        </View>
      </View>

      {/* Bar chart showing monthly expenses trend for selected period. */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.expensesOverTime")}
        </Text>
        <View style={styles.chartContainer} key={`bar-chart-${period}`}>
          {monthlySeries.data.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
              {t("dashboard.stats.empty")}
            </Text>
          ) : (
            <View style={styles.chartFrame}>
              <ChartYAxis
                height={CHART_BAR_HEIGHT}
                yTicks={barChartScale.yTicks}
                textColor={theme.colors.muted}
                grid={theme.colors.border}
                formatYLabel={formatChartYAxisLabel}
              />
              <ScrollView
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                style={styles.chartScroll}
                contentContainerStyle={[
                  styles.chartScrollContent,
                  { minWidth: chartScrollViewportWidth },
                ]}
              >
                <SimpleBarChart
                  data={monthlySeries.data}
                  width={barChartWidth}
                  height={CHART_BAR_HEIGHT}
                  niceMaxY={barChartScale.niceMaxY}
                  yTicks={barChartScale.yTicks}
                  fill={theme.colors.accent}
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  formatXLabel={formatChartMonth}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Fuel-focused quick stats card with direct link to full fuel history. */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.fuelStats")}
          </Text>
          <Pressable onPress={navigateToFuel} hitSlop={8}>
            <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
              {t("dashboard.stats.viewAll")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.metrics.avgFuelConsumption")}
            valueMain={
              Number.isFinite(totals.avgConsumptionPer100)
                ? fmtNumber(totals.avgConsumptionPer100, 1)
                : "—"
            }
            valueSuffix={
              Number.isFinite(totals.avgConsumptionPer100)
                ? `${fuelUnitShort}/100${distanceUnit}`
                : undefined
            }
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.avgCostPerUnit", { unit: fuelUnitShort })}
            valueMain={
              Number.isFinite(totals.avgCostPerLiter)
                ? fmtNumber(totals.avgCostPerLiter, 2)
                : "—"
            }
            valueSuffix={
              Number.isFinite(totals.avgCostPerLiter) ? currency : undefined
            }
          />
        </View>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={
              lastRefuelHint
                ? `${t("dashboard.stats.lastRefuel")} (${lastRefuelHint})`
                : t("dashboard.stats.lastRefuel")
            }
            valueMain={lastRefuelAmountMain}
            valueSuffix={
              Number.isFinite(lastRefuelAmount) ? fuelUnitLabel : undefined
            }
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.metrics.totalDistance")}
            valueMain={
              fuelStatsDistance != null ? fmtNumber(fuelStatsDistance, 0) : "—"
            }
            valueSuffix={fuelStatsDistance != null ? distanceUnit : undefined}
          />
        </View>
      </View>

      {/* Line chart showing monthly driven distance for selected period. */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.distanceOverTime")}
        </Text>
        <View style={styles.chartContainer} key={`distance-chart-${period}`}>
          {monthlyDistanceSeries.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
              {t("dashboard.stats.empty")}
            </Text>
          ) : (
            <View style={styles.chartFrame}>
              <ChartYAxis
                height={CHART_LINE_HEIGHT}
                yTicks={lineChartScale.yTicks}
                textColor={theme.colors.muted}
                grid={theme.colors.border}
                formatYLabel={formatChartYAxisLabel}
              />
              <ScrollView
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                style={styles.chartScroll}
                contentContainerStyle={[
                  styles.chartScrollContent,
                  { minWidth: chartScrollViewportWidth },
                ]}
              >
                <SimpleLineChart
                  data={monthlyDistanceSeries}
                  width={lineChartWidth}
                  height={CHART_LINE_HEIGHT}
                  minY={0}
                  maxY={lineChartScale.niceMaxY}
                  yTicks={lineChartScale.yTicks}
                  stroke={theme.colors.accent}
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  formatXLabel={formatChartMonth}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Latest three service entries preview with navigation to service history. */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.recentService")}
          </Text>
          <Pressable onPress={navigateToServiceHistory} hitSlop={8}>
            <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
              {t("dashboard.stats.viewAll")}
            </Text>
          </Pressable>
        </View>
        {recentServiceEntries.length > 0 ? (
          <View style={styles.recentServiceList}>
            {recentServiceEntries.map((entry) => {
              const cat = (entry.category ?? "other") as ServiceEntryCategory;
              return (
                <ServiceItem
                  key={entry.id}
                  title={entry.title}
                  icon={renderServiceIcon(cat)}
                  iconBackgroundColor={SERVICE_CATEGORY_ICON_BACKGROUND[cat]}
                  date={entry.service_date}
                  mileage={entry.mileage}
                  distanceUnit={distanceUnit}
                  workshopName={
                    entry.workshop_id
                      ? workshopsById[entry.workshop_id]?.name
                      : null
                  }
                  cost={entry.cost}
                  currency={currency}
                  onPress={() => {
                    if (embedded) {
                      navigation.navigate("ServiceEntryForm", {
                        entryId: entry.id,
                        vehicleId,
                      });
                      return;
                    }
                    props.navigation.navigate("ServiceEntryForm", {
                      entryId: entry.id,
                      vehicleId,
                    });
                  }}
                />
              );
            })}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.colors.muted }]}>
            {t("dashboard.stats.empty")}
          </Text>
        )}
      </View>

      {/* Donut chart and legend for expense distribution by category. */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.expensesByCategory")}
        </Text>
        <View style={styles.chartContainer} key={`pie-chart-${period}`}>
          {categorySeries.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
              {t("dashboard.stats.empty")}
            </Text>
          ) : (
            <View style={styles.pieChartWrap}>
              <SimplePieChart
                data={categorySeries.map((c) => ({
                  label: c.label,
                  value: c.value,
                }))}
                size={Math.min(chartViewportWidth - 48, isNarrow ? 220 : 260)}
                colors={categorySeries.map((c) => c.color)}
              />
            </View>
          )}
        </View>
        {categorySeries.length > 0 ? (
          <Pressable
            style={({ pressed }) => [
              styles.legendCard,
              { backgroundColor: theme.colors.card },
              pressed && styles.legendCardPressed,
            ]}
            onPress={() => setLegendShowPercent((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.stats.charts.expensesByCategory")}
            accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
          >
            <View style={styles.legend}>
              {categorySeries.map((c) => {
                const pct =
                  totalByCategory > 0
                    ? (c.value / totalByCategory) * 100
                    : Number.NaN;
                return (
                  <View key={c.key} style={styles.legendRow}>
                    <View
                      style={[styles.legendDot, { backgroundColor: c.color }]}
                    />
                    <Text
                      style={[styles.legendLabel, { color: theme.colors.fg }]}
                      numberOfLines={2}
                    >
                      {c.label}
                    </Text>
                    <View style={styles.legendValueWrap}>
                      {legendShowPercent ? (
                        <Text style={styles.legendValue}>{fmtPct(pct)}</Text>
                      ) : (
                        <Text style={styles.legendValue}>
                          {fmtMoney(c.value, currency)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Pressable>
        ) : null}
      </View>

      {/* Oil change recency and average interval toggles. */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.oilChange")}
        </Text>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.lastChange")}
            valueMain={
              oilLastChangeShowDate
                ? lastOilChangeDateLabel
                : lastOilChange?.mileage != null
                  ? fmtNumber(lastOilChange.mileage, 0)
                  : "—"
            }
            valueSuffix={
              !oilLastChangeShowDate && lastOilChange?.mileage != null
                ? distanceUnit
                : undefined
            }
            onPress={() => setOilLastChangeShowDate((p) => !p)}
            accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.avgInterval")}
            valueMain={
              oilAvgIntervalShowMonths
                ? Number.isFinite(oilIntervals.avgMonths)
                  ? fmtMonths(oilIntervals.avgMonths)
                  : "—"
                : Number.isFinite(oilIntervals.avgKm)
                  ? fmtNumber(oilIntervals.avgKm, 0)
                  : "—"
            }
            valueSuffix={
              oilAvgIntervalShowMonths
                ? Number.isFinite(oilIntervals.avgMonths)
                  ? t("dashboard.stats.months")
                  : undefined
                : Number.isFinite(oilIntervals.avgKm)
                  ? distanceUnit
                  : undefined
            }
            onPress={() => setOilAvgIntervalShowMonths((p) => !p)}
            accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
          />
        </View>
        {oilLife ? (
          <View
            style={[styles.oilLifeCard, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.oilLifeTopRow}>
              <View style={styles.oilLifeTopCell}>
                <Text style={[styles.oilLifeLabel]}>
                  {t("dashboard.stats.estNextShort")}
                </Text>
                <Text
                  style={[styles.oilLifeMainValue, { color: theme.colors.fg }]}
                >
                  {`${oilLife.remainingDays}d`}
                </Text>
              </View>
              <View style={styles.oilLifeTopCell}>
                <Text style={[styles.oilLifeLabel]}>
                  {t("dashboard.stats.estRemaining")}
                </Text>
                <Text
                  style={[styles.oilLifeMainValue, { color: theme.colors.fg }]}
                >
                  {oilLife.remainingKm != null
                    ? `${oilLife.remainingKm.toLocaleString()} ${distanceUnit}`
                    : `${oilLife.remainingDays}d`}
                </Text>
              </View>
            </View>

            <View style={styles.oilLifeProgressTrack}>
              <View
                style={[
                  styles.oilLifeProgressFill,
                  {
                    width: `${oilLifeProgressPercent}%`,
                    backgroundColor: oilLife.isOverdue
                      ? theme.colors.danger
                      : oilLife.isDueSoon
                        ? "#EAB308"
                        : theme.colors.accent,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={styles.oilLifeProgressTextLayer}
              >
                <Text
                  style={[
                    styles.oilLifeProgressText,
                    { color: theme.colors.fg },
                  ]}
                >
                  {oilLifeStatusText}
                </Text>
              </View>
              <View
                pointerEvents="none"
                style={[
                  styles.oilLifeProgressTextOverlay,
                  { width: `${oilLifeProgressPercent}%` },
                ]}
              >
                <View
                  style={[
                    styles.oilLifeProgressTextOverlayInner,
                    { width: `${oilLifeOverlayTextWidthPercent}%` },
                  ]}
                >
                  <Text
                    style={[styles.oilLifeProgressText, { color: "#000000" }]}
                  >
                    {oilLifeStatusText}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

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

const makeStyles = (theme: any) =>
  StyleSheet.create({
    panelWrap: {
      paddingBottom: theme.spacing.sm,
    },
    loading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    heroCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    heroLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
    },
    heroValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.largeTitle,
    },
    heroMeta: {
      fontWeight: theme.typography.fontWeight.medium,
      fontSize: theme.typography.small,
    },
    tilesRow: { flexDirection: "row", gap: theme.spacing.sm },
    tile: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    tileFullWidth: {
      flex: undefined,
      width: "100%",
    },
    tileTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    },
    tileLabel: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.body,
      flex: 1,
    },
    tileValueRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    tilePressableIcon: {
      marginLeft: theme.spacing.xs,
    },
    tileValueMain: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    tileValueSuffix: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
    },
    section: {
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    viewAllLink: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    oilLifeTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    oilLifeTopCell: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    oilLifeLabel: {
      fontSize: theme.typography.body,
      color: theme.colors.accent,
    },
    oilLifeMainValue: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeProgressTrack: {
      height: 44,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: theme.colors.bg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
    },
    oilLifeProgressFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    oilLifeProgressText: {
      textAlign: "center",
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeProgressTextLayer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    oilLifeProgressTextOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      overflow: "hidden",
      justifyContent: "center",
    },
    oilLifeProgressTextOverlayInner: {
      justifyContent: "center",
    },
    recentServiceList: {
      gap: theme.spacing.sm,
    },
    empty: { fontSize: theme.typography.body },
    chartContainer: {
      width: "100%",
    },
    chartFrame: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-start",
    },
    chartScroll: {
      flex: 1,
    },
    chartScrollContent: {
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
    pieChartWrap: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    legend: {
      gap: theme.spacing.md,
      width: "100%",
    },
    legendCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    legendCardPressed: {
      opacity: 0.85,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    legendRowPressed: {
      opacity: 0.7,
    },
    legendDot: {
      width: 14,
      height: 14,
      borderRadius: 999,
    },
    legendLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      flex: 1,
    },
    legendValueWrap: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 2,
    },
    legendValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
  });
