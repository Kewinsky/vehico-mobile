import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";

import { VICTORY_DONUT_MAX_SIZE } from "./victoryChartConstants";

type CategoryDatum = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  data: CategoryDatum[];
  size: number;
};

export function VictoryCategoryDonutChart({ data, size }: Props) {
  const chartSize = Math.max(180, Math.min(size, VICTORY_DONUT_MAX_SIZE));

  return (
    <View
      style={{
        width: chartSize,
        height: chartSize,
        alignSelf: "center",
      }}
    >
      <PolarChart
        data={data}
        labelKey="label"
        valueKey="value"
        colorKey="color"
        explicitSize={{ width: chartSize, height: chartSize }}
      >
        <Pie.Chart innerRadius="56%" startAngle={-90} />
      </PolarChart>
    </View>
  );
}
