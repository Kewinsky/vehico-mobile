import { useState } from "react";
import Svg, {
  Circle,
  Line as SvgLine,
  Path,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import {
  clampNonNeg,
  generateNiceTicks,
  niceMaxValue,
} from "../../../statistics/domain/math";

type XY = { x: string; y: number };
export type ChartYTick = { value: number; y: number };
export function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
export function donutSlicePath(
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

export function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  corners: {
    topLeft: boolean;
    topRight: boolean;
    bottomRight: boolean;
    bottomLeft: boolean;
  },
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const tl = corners.topLeft ? r : 0;
  const tr = corners.topRight ? r : 0;
  const br = corners.bottomRight ? r : 0;
  const bl = corners.bottomLeft ? r : 0;
  return [
    `M ${x + tl} ${y}`,
    `H ${x + width - tr}`,
    tr > 0
      ? `Q ${x + width} ${y} ${x + width} ${y + tr}`
      : `L ${x + width} ${y}`,
    `V ${y + height - br}`,
    br > 0
      ? `Q ${x + width} ${y + height} ${x + width - br} ${y + height}`
      : `L ${x + width} ${y + height}`,
    `H ${x + bl}`,
    bl > 0
      ? `Q ${x} ${y + height} ${x} ${y + height - bl}`
      : `L ${x} ${y + height}`,
    `V ${y + tl}`,
    tl > 0 ? `Q ${x} ${y} ${x + tl} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

export const CHART_AXIS_FONT_SIZE = 13;
export const CHART_LINE_HEIGHT = 260;
export const CHART_BAR_HEIGHT = 260;
export const CHART_Y_AXIS_WIDTH = 44;
export const CHART_PLOT_PADDING_LEFT = 8;
export const CHART_PLOT_PADDING_RIGHT = 16;
export const CHART_PLOT_PADDING_TOP = 16;
export const CHART_PLOT_PADDING_BOTTOM = 44;
export const CHART_LINE_START_INSET = 14;
export const CHART_ITEM_MIN_WIDTH = 72;
export const CHART_MIN_EXTRA_WIDTH = 60;

export function getChartScale(values: number[], height: number) {
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

export function getScrollableChartWidth(
  itemCount: number,
  minWidth: number,
  itemWidth = CHART_ITEM_MIN_WIDTH,
) {
  return Math.max(
    minWidth,
    Math.max(itemCount, 1) * itemWidth + CHART_MIN_EXTRA_WIDTH,
  );
}

export function ChartYAxis({
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

type ChartTooltipRow = {
  color: string;
  value: string;
};

function estimateTooltipWidth(lines: string[]) {
  const maxChars = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return Math.max(124, Math.min(220, maxChars * 7 + 28));
}

function SvgChartTooltip({
  visible,
  anchorX,
  anchorY,
  viewportWidth,
  viewportHeight,
  title,
  rows,
  backgroundColor,
  textColor,
}: {
  visible: boolean;
  anchorX: number;
  anchorY: number;
  viewportWidth: number;
  viewportHeight: number;
  title: string;
  rows: ChartTooltipRow[];
  backgroundColor: string;
  textColor: string;
}) {
  if (!visible) return null;
  const tooltipWidth = estimateTooltipWidth([
    title,
    ...rows.map((row) => row.value),
  ]);
  const rowCount = rows.length;
  const tooltipHeight = 34 + rowCount * 16 + 8;
  const tooltipMargin = 8;
  const tooltipX = Math.max(
    CHART_PLOT_PADDING_LEFT,
    Math.min(
      viewportWidth - CHART_PLOT_PADDING_RIGHT - tooltipWidth,
      anchorX - tooltipWidth / 2,
    ),
  );
  const tooltipY = Math.max(
    CHART_PLOT_PADDING_TOP,
    Math.min(
      anchorY,
      viewportHeight - CHART_PLOT_PADDING_BOTTOM - tooltipHeight,
    ) -
      tooltipMargin -
      tooltipHeight,
  );

  return (
    <>
      <Rect
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={tooltipHeight}
        rx={8}
        fill={backgroundColor}
      />
      <SvgText
        x={tooltipX + 10}
        y={tooltipY + 20}
        fontSize={12}
        fill={textColor}
        fontWeight="700"
      >
        {title}
      </SvgText>
      {rows.flatMap((row, idx) => {
        const y = tooltipY + 38 + idx * 16;
        return [
          <Circle
            key={`tooltip-dot-${idx}`}
            cx={tooltipX + 14}
            cy={y}
            r={4}
            fill={row.color}
          />,
          <SvgText
            key={`tooltip-text-${idx}`}
            x={tooltipX + 24}
            y={y + 4}
            fontSize={11}
            fill={textColor}
          >
            {row.value}
          </SvgText>,
        ];
      })}
    </>
  );
}

export function SimpleStackedBarChart({
  data,
  width,
  height,
  niceMaxY,
  yTicks,
  fuelFill,
  serviceFill,
  grid,
  textColor,
  formatXLabel,
  currency,
  tooltipBg,
  tooltipText,
}: {
  data: { x: string; fuel: number; service: number }[];
  width: number;
  height: number;
  niceMaxY: number;
  yTicks: ChartYTick[];
  fuelFill: string;
  serviceFill: string;
  grid: string;
  textColor: string;
  formatXLabel?: (key: string) => string;
  currency: string;
  tooltipBg: string;
  tooltipText: string;
}) {
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
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
    const fuelValue = clampNonNeg(d.fuel);
    const serviceValue = clampNonNeg(d.service);
    const fuelHeight = (fuelValue / niceMaxY) * plotH;
    const serviceHeight = (serviceValue / niceMaxY) * plotH;
    const fuelY = CHART_PLOT_PADDING_TOP + plotH - fuelHeight;
    const serviceY = fuelY - serviceHeight;
    return {
      x: barX,
      width: barWidth,
      fuelY,
      fuelHeight,
      serviceY,
      serviceHeight,
      label: formatXLabel ? formatXLabel(d.x) : d.x.replace("-", "/"),
      fuelValue,
      serviceValue,
      totalValue: fuelValue + serviceValue,
    };
  });
  const xTicks = bars.map((b, i) => ({
    x: b.x + b.width / 2,
    label: b.label,
    index: i,
  }));
  const selectedBar =
    selectedBarIndex != null ? (bars[selectedBarIndex] ?? null) : null;
  const tooltipTitle = selectedBar
    ? `${selectedBar.label}  ${selectedBar.totalValue.toFixed(2)} ${currency}`
    : "";
  const tooltipRows: ChartTooltipRow[] = selectedBar
    ? [
        {
          color: fuelFill,
          value: `${selectedBar.fuelValue.toFixed(2)} ${currency}`,
        },
        {
          color: serviceFill,
          value: `${selectedBar.serviceValue.toFixed(2)} ${currency}`,
        },
      ]
    : [];
  const tooltipAnchorX = selectedBar
    ? selectedBar.x + selectedBar.width / 2
    : 0;
  const tooltipAnchorY = selectedBar
    ? selectedBar.serviceHeight > 0
      ? selectedBar.serviceY
      : selectedBar.fuelY
    : 0;

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
      {bars.map((bar, i) => {
        const hasFuel = bar.fuelHeight > 0;
        const hasService = bar.serviceHeight > 0;
        if (!hasFuel) return null;
        const d = roundedRectPath(
          bar.x,
          bar.fuelY,
          bar.width,
          bar.fuelHeight,
          5,
          {
            topLeft: !hasService,
            topRight: !hasService,
            bottomRight: true,
            bottomLeft: true,
          },
        );
        return <Path key={`fuel-bar-${i}`} d={d} fill={fuelFill} />;
      })}
      {bars.map((bar, i) => {
        const hasFuel = bar.fuelHeight > 0;
        const hasService = bar.serviceHeight > 0;
        if (!hasService) return null;
        const d = roundedRectPath(
          bar.x,
          bar.serviceY,
          bar.width,
          bar.serviceHeight,
          5,
          {
            topLeft: true,
            topRight: true,
            bottomRight: !hasFuel,
            bottomLeft: !hasFuel,
          },
        );
        return <Path key={`service-bar-${i}`} d={d} fill={serviceFill} />;
      })}
      {bars.map((bar, i) => {
        const topY = bar.serviceHeight > 0 ? bar.serviceY : bar.fuelY;
        const totalHeight = bar.fuelHeight + bar.serviceHeight;
        return (
          <Rect
            key={`bar-hitbox-${i}`}
            x={bar.x}
            y={topY}
            width={bar.width}
            height={Math.max(totalHeight, 24)}
            fill="transparent"
            onPress={() =>
              setSelectedBarIndex((prev) => (prev === i ? null : i))
            }
          />
        );
      })}
      <SvgChartTooltip
        visible={selectedBar != null}
        anchorX={tooltipAnchorX}
        anchorY={tooltipAnchorY}
        viewportWidth={w}
        viewportHeight={h}
        title={tooltipTitle}
        rows={tooltipRows}
        backgroundColor={tooltipBg}
        textColor={tooltipText}
      />
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

export function SimpleLineChart({
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
  referenceLineY,
  referenceLineStroke,
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
  referenceLineY?: number;
  referenceLineStroke?: string;
}) {
  const w = width;
  const h = height;
  const plotH = h - CHART_PLOT_PADDING_TOP - CHART_PLOT_PADDING_BOTTOM;
  const lineStartX = CHART_PLOT_PADDING_LEFT + CHART_LINE_START_INSET;
  const lineEndX = w - CHART_PLOT_PADDING_RIGHT;
  const linePlotW = Math.max(0, lineEndX - lineStartX);
  const yRange = Math.max(1, maxY - minY);
  const referenceLineYPos =
    Number.isFinite(referenceLineY) && referenceLineY != null
      ? CHART_PLOT_PADDING_TOP +
        (1 - Math.min(1, Math.max(0, (referenceLineY - minY) / yRange))) * plotH
      : null;
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
  const xTicks: { x: number; label: string; index: number }[] = [];
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
      {referenceLineYPos != null ? (
        <SvgLine
          x1={0}
          y1={referenceLineYPos}
          x2={w}
          y2={referenceLineYPos}
          stroke={referenceLineStroke ?? stroke}
          strokeWidth={2}
          strokeDasharray="6,4"
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

export function SimpleDualLineChart({
  dataPrimary,
  dataSecondary,
  width,
  height,
  minY,
  maxY,
  yTicks,
  primaryStroke,
  secondaryStroke,
  grid,
  textColor,
  formatXLabel,
}: {
  dataPrimary: XY[];
  dataSecondary: XY[];
  width: number;
  height: number;
  minY: number;
  maxY: number;
  yTicks: ChartYTick[];
  primaryStroke: string;
  secondaryStroke: string;
  grid: string;
  textColor: string;
  formatXLabel?: (key: string) => string;
}) {
  const w = width;
  const h = height;
  const plotH = h - CHART_PLOT_PADDING_TOP - CHART_PLOT_PADDING_BOTTOM;
  const lineStartX = CHART_PLOT_PADDING_LEFT + CHART_LINE_START_INSET;
  const lineEndX = w - CHART_PLOT_PADDING_RIGHT;
  const linePlotW = Math.max(0, lineEndX - lineStartX);
  const yRange = Math.max(1, maxY - minY);
  const dataLength = Math.max(dataPrimary.length, dataSecondary.length);
  const toPoint = (d: XY, i: number) => {
    const x =
      dataLength <= 1
        ? lineStartX + linePlotW / 2
        : lineStartX + (i / (dataLength - 1)) * linePlotW;
    const normalizedY = Math.min(
      1,
      Math.max(0, (clampNonNeg(d.y) - minY) / yRange),
    );
    const y = CHART_PLOT_PADDING_TOP + (1 - normalizedY) * plotH;
    return { x, y, label: d.x };
  };
  const primaryPoints = dataPrimary.map(toPoint);
  const secondaryPoints = dataSecondary.map(toPoint);
  const toXLabel = (key: string) =>
    formatXLabel ? formatXLabel(key) : key.replace("-", "/");
  const baseTicks = dataPrimary.length > 0 ? primaryPoints : secondaryPoints;
  const xTicks = baseTicks.map((p, i) => ({
    x: p.x,
    label: toXLabel(p.label),
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
      {primaryPoints.length > 0 ? (
        <Polyline
          points={primaryPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={primaryStroke}
          strokeWidth={3}
        />
      ) : null}
      {secondaryPoints.length > 0 ? (
        <Polyline
          points={secondaryPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={secondaryStroke}
          strokeWidth={3}
        />
      ) : null}
      {primaryPoints.length > 0 ? (
        <Circle
          cx={primaryPoints[0].x}
          cy={primaryPoints[0].y}
          r={4}
          fill={primaryStroke}
        />
      ) : null}
      {primaryPoints.length > 0 ? (
        <Circle
          cx={primaryPoints[primaryPoints.length - 1].x}
          cy={primaryPoints[primaryPoints.length - 1].y}
          r={4}
          fill={primaryStroke}
        />
      ) : null}
      {secondaryPoints.length > 0 ? (
        <Circle
          cx={secondaryPoints[0].x}
          cy={secondaryPoints[0].y}
          r={4}
          fill={secondaryStroke}
        />
      ) : null}
      {secondaryPoints.length > 0 ? (
        <Circle
          cx={secondaryPoints[secondaryPoints.length - 1].x}
          cy={secondaryPoints[secondaryPoints.length - 1].y}
          r={4}
          fill={secondaryStroke}
        />
      ) : null}
    </Svg>
  );
}

export function SimplePieChart({
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
