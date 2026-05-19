import { Pressable, ScrollView, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { CHART_LINE_HEIGHT, ChartYAxis, SimpleDualLineChart } from "../charts/charts";
import { fmtChartNumber } from "../../../statistics/domain/math";
import { PremiumFeatureGate } from "../../../../../ui/limits/PremiumFeatureGate";
import type { StatisticsPanelProps } from "../types";

export function ConsumptionVsFuelPriceChartSection({
  styles,
  theme,
  t,
  isPremium,
  navigation,
  period,
  fuelVsConsumptionSeries,
  fuelComparisonScale,
  dualLineChartWidth,
  chartScrollViewportWidth,
  formatChartMonth,
  showChartInfo,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderInline}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.charts.consumptionVsFuelPrice")}
          </Text>
          <Pressable
            style={styles.infoIconButton}
            onPress={() => showChartInfo("consumptionVsFuelPrice")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.stats.chartInfo.open")}
            disabled={!isPremium}
          >
            <CircleHelp size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
        <PremiumFeatureGate isPremium={isPremium} navigation={navigation}>
        <View style={styles.legendInline}>
          <View style={styles.legendInlineItem}>
            <View
              style={[
                styles.legendInlineDot,
                { backgroundColor: theme.colors.accent },
              ]}
            />
            <Text style={[styles.legendInlineText, { color: theme.colors.fg }]}>
              {t("dashboard.stats.charts.legend.consumption")}
            </Text>
          </View>
          <View style={styles.legendInlineItem}>
            <View
              style={[styles.legendInlineDot, { backgroundColor: "#8B5CF6" }]}
            />
            <Text style={[styles.legendInlineText, { color: theme.colors.fg }]}>
              {t("dashboard.stats.charts.legend.fuelPrice")}
            </Text>
          </View>
        </View>
        <View
          style={styles.chartContainer}
          key={`fuel-consumption-chart-${period}`}
        >
          {fuelVsConsumptionSeries.consumption.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
              {t("dashboard.stats.empty")}
            </Text>
          ) : (
            <View style={styles.chartFrame}>
              <ChartYAxis
                height={CHART_LINE_HEIGHT}
                yTicks={fuelComparisonScale.yTicks}
                textColor={theme.colors.muted}
                grid={theme.colors.border}
                formatYLabel={fmtChartNumber}
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
                <SimpleDualLineChart
                  dataPrimary={fuelVsConsumptionSeries.consumption}
                  dataSecondary={fuelVsConsumptionSeries.fuelPrice}
                  width={dualLineChartWidth}
                  height={CHART_LINE_HEIGHT}
                  minY={0}
                  maxY={fuelComparisonScale.niceMaxY}
                  yTicks={fuelComparisonScale.yTicks}
                  primaryStroke={theme.colors.accent}
                  secondaryStroke="#8B5CF6"
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  formatXLabel={formatChartMonth}
                />
              </ScrollView>
            </View>
          )}
        </View>
        </PremiumFeatureGate>
      </View>
  );
}
