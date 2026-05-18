import { Pressable, ScrollView, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { CHART_LINE_HEIGHT, ChartYAxis, SimpleLineChart } from "../charts/charts";
import type { StatisticsPanelProps } from "../types";

export function CostPerKmChartSection({
  styles, theme, t, period, costPerDistanceSeries, lineChartScale, avgCostPerDistance, chartScrollViewportWidth, lineChartWidth, formatChartMonth, formatChartYAxisLabel, showChartInfo,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderInline}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.charts.costPerKmOverTime")}
          </Text>
          <Pressable
            style={styles.infoIconButton}
            onPress={() => showChartInfo("costPerKm")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.stats.chartInfo.open")}
          >
            <CircleHelp size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
        <View style={styles.chartContainer} key={`distance-chart-${period}`}>
          {costPerDistanceSeries.length === 0 ? (
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
                  data={costPerDistanceSeries}
                  width={lineChartWidth}
                  height={CHART_LINE_HEIGHT}
                  minY={0}
                  maxY={lineChartScale.niceMaxY}
                  yTicks={lineChartScale.yTicks}
                  stroke={theme.colors.accent}
                  referenceLineY={avgCostPerDistance}
                  referenceLineStroke="#EF4444"
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  formatXLabel={formatChartMonth}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>
  );
}
