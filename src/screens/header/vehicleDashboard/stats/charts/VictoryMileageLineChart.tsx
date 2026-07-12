import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Circle } from "@shopify/react-native-skia";
import { CartesianChart, Line, useChartPressState } from "victory-native";

import { mileageAxisScaleForData } from "../../../statistics/domain/math";
import { ChartTooltipBanner } from "./ChartTooltipBanner";
import { VICTORY_CHART_HEIGHT } from "./victoryChartConstants";
import { useChartPressTooltipText } from "./useChartPressTooltipText";
import { useVictoryChartFont } from "./useVictoryChartFont";

type MileagePoint = { x: string; y: number };

type Props = {
  data: MileagePoint[];
  accentColor: string;
  mutedColor: string;
  borderColor: string;
  cardColor: string;
  textColor: string;
  formatMonth: (key: string) => string;
  formatMonthFull: (key: string) => string;
  formatYLabel: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
};

export function VictoryMileageLineChart({
  data,
  accentColor,
  mutedColor,
  borderColor,
  cardColor,
  textColor,
  formatMonth,
  formatMonthFull,
  formatYLabel,
  formatValue,
  height = VICTORY_CHART_HEIGHT,
}: Props) {
  const font = useVictoryChartFont();
  const chartData = useMemo(
    () => data.map((point) => ({ month: point.x, mileage: point.y })),
    [data],
  );
  const yDomain = useMemo(() => {
    const { minY, maxY } = mileageAxisScaleForData(data.map((point) => point.y));
    return [minY, maxY] as [number, number];
  }, [data]);
  const initialMonth = chartData[0]?.month ?? "";
  const { state, isActive } = useChartPressState({
    x: initialMonth,
    y: { mileage: 0 },
  });

  const buildTooltipText = useCallback(
    (month: string, y: { mileage: number }) =>
      `${formatMonthFull(month)}\n${formatValue(y.mileage)}`,
    [formatMonthFull, formatValue],
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
          yKeys={["mileage"]}
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
          {({ points }) => (
            <>
              <Line points={points.mileage} color={accentColor} strokeWidth={3} />
              {isActive ? (
                <Circle
                  cx={state.x.position}
                  cy={state.y.mileage.position}
                  r={6}
                  color={accentColor}
                />
              ) : null}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
