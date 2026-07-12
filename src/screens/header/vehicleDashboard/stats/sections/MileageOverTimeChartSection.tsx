import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { ChartHorizontalScroll } from "../components/ChartHorizontalScroll";
import { CHART_LINE_HEIGHT, CHART_MILEAGE_Y_AXIS_WIDTH, ChartYAxis, SimpleLineChart } from "../charts/charts";
import type { StatisticsPanelProps } from "../types";

export function MileageOverTimeChartSection({
  styles,
  theme,
  t,
  isPremium,
  period,
  mileageOverTimeSeries,
  mileageChartScale,
  chartScrollViewportWidth,
  mileageChartWidth,
  formatChartMonth,
  formatChartMonthFull,
  formatChartYAxisLabel,
  formatMileageChartValue,
  showChartInfo,
}: StatisticsPanelProps) {
  if (!isPremium) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderInline}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.mileageOverTime")}
        </Text>
        <Pressable
          style={styles.infoIconButton}
          onPress={() => showChartInfo("mileageOverTime")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.stats.chartInfo.open")}
        >
          <CircleHelp size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
      <View style={styles.chartContainer} key={`mileage-chart-${period}`}>
        {mileageOverTimeSeries.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.muted }]}>
            {t("dashboard.stats.empty")}
          </Text>
        ) : (
          <View style={styles.chartFrame}>
            <ChartYAxis
              width={CHART_MILEAGE_Y_AXIS_WIDTH}
              height={CHART_LINE_HEIGHT}
              yTicks={mileageChartScale.yTicks}
              textColor={theme.colors.muted}
              grid={theme.colors.border}
              formatYLabel={formatChartYAxisLabel}
            />
            <ChartHorizontalScroll
              contentWidth={mileageChartWidth}
              viewportWidth={chartScrollViewportWidth}
              maxHeight={CHART_LINE_HEIGHT}
              style={styles.chartScroll}
              contentContainerStyle={styles.chartScrollContent}
            >
              <SimpleLineChart
                data={mileageOverTimeSeries}
                width={mileageChartWidth}
                height={CHART_LINE_HEIGHT}
                minY={mileageChartScale.minY}
                maxY={mileageChartScale.niceMaxY}
                yTicks={mileageChartScale.yTicks}
                stroke={theme.colors.accent}
                grid={theme.colors.border}
                textColor={theme.colors.muted}
                formatXLabel={formatChartMonth}
                formatTooltipXLabel={formatChartMonthFull}
                formatTooltipValue={formatMileageChartValue}
                tooltipBg={theme.colors.card}
                tooltipText={theme.colors.fg}
              />
            </ChartHorizontalScroll>
          </View>
        )}
      </View>
    </View>
  );
}
