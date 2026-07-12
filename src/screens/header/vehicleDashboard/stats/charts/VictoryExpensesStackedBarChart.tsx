import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Circle } from "@shopify/react-native-skia";
import {
  CartesianChart,
  StackedBar,
  useChartPressState,
} from "victory-native";

import { niceMaxValue } from "../../../statistics/domain/math";
import { ChartTooltipBanner } from "./ChartTooltipBanner";
import { VICTORY_CHART_HEIGHT } from "./victoryChartConstants";
import { useChartPressTooltipText } from "./useChartPressTooltipText";
import { useVictoryChartFont } from "./useVictoryChartFont";

type ExpenseBarPoint = {
  x: string;
  fuel: number;
  service: number;
};

type Props = {
  data: ExpenseBarPoint[];
  fuelColor: string;
  serviceColor: string;
  mutedColor: string;
  borderColor: string;
  cardColor: string;
  textColor: string;
  fuelLabel: string;
  serviceLabel: string;
  formatMonth: (key: string) => string;
  formatMonthFull: (key: string) => string;
  formatYLabel: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
};

const BAR_CORNER_RADIUS = 5;

export function VictoryExpensesStackedBarChart({
  data,
  fuelColor,
  serviceColor,
  mutedColor,
  borderColor,
  cardColor,
  textColor,
  fuelLabel,
  serviceLabel,
  formatMonth,
  formatMonthFull,
  formatYLabel,
  formatValue,
  height = VICTORY_CHART_HEIGHT,
}: Props) {
  const font = useVictoryChartFont();
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        month: point.x,
        fuel: point.fuel,
        service: point.service,
      })),
    [data],
  );
  const yDomain = useMemo(() => {
    const maxTotal = Math.max(
      0,
      ...data.map((point) => point.fuel + point.service),
    );
    return [0, niceMaxValue(maxTotal)] as [number, number];
  }, [data]);
  const initialMonth = chartData[0]?.month ?? "";
  const { state, isActive } = useChartPressState({
    x: initialMonth,
    y: { fuel: 0, service: 0 },
  });

  const buildTooltipText = useCallback(
    (month: string, y: { fuel: number; service: number }) => {
      const total = y.fuel + y.service;
      return [
        formatMonthFull(month),
        formatValue(total),
        `${fuelLabel}: ${formatValue(y.fuel)}`,
        `${serviceLabel}: ${formatValue(y.service)}`,
      ].join("\n");
    },
    [formatMonthFull, formatValue, fuelLabel, serviceLabel],
  );

  const tooltipText = useChartPressTooltipText({
    state,
    buildText: buildTooltipText,
  });

  if (!font) {
    return <View style={{ height }} />;
  }

  return (
    <View style={{ width: "100%" }}>
      <ChartTooltipBanner
        text={tooltipText}
        backgroundColor={cardColor}
        textColor={textColor}
      />
      <View style={{ height, width: "100%" }}>
        <CartesianChart
          data={chartData}
          xKey="month"
          yKeys={["fuel", "service"]}
          domain={{ y: yDomain }}
          domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}
          chartPressState={state}
          xAxis={{
            font,
            labelColor: mutedColor,
            lineColor: borderColor,
            formatXLabel: formatMonth,
          }}
          yAxis={[
            {
              font,
              labelColor: mutedColor,
              lineColor: borderColor,
              formatYLabel,
            },
          ]}
        >
          {({ points, chartBounds }) => (
            <>
              <StackedBar
                chartBounds={chartBounds}
                points={[points.fuel, points.service]}
                colors={[fuelColor, serviceColor]}
                innerPadding={0.2}
                barOptions={({ isBottom, isTop }) => ({
                  roundedCorners: isTop
                    ? {
                        topLeft: BAR_CORNER_RADIUS,
                        topRight: BAR_CORNER_RADIUS,
                      }
                    : isBottom
                      ? {
                          bottomLeft: BAR_CORNER_RADIUS,
                          bottomRight: BAR_CORNER_RADIUS,
                        }
                      : undefined,
                })}
              />
              {isActive ? (
                <Circle
                  cx={state.x.position}
                  cy={state.y.service.position}
                  r={6}
                  color={fuelColor}
                />
              ) : null}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
