import { useFont } from "@shopify/react-native-skia";

const CHART_FONT = require("../../../../../../fonts/ChironGoRoundTC-Bold.ttf");

export function useVictoryChartFont(size = 11) {
  return useFont(CHART_FONT, size);
}
