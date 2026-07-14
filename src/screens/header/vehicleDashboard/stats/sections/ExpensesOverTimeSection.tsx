import { Pressable, ScrollView, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { DashboardSectionHeader } from "../../components/DashboardSectionHeader";
import { CHART_BAR_HEIGHT, ChartYAxis, SimpleStackedBarChart } from "../charts/charts";
import type { StatisticsPanelProps } from "../types";

export function ExpensesOverTimeSection({
  styles,
  theme,
  t,
  period,
  monthlyExpensesSeries,
  barChartScale,
  barChartWidth,
  chartScrollViewportWidth,
  formatChartMonth,
  formatChartMonthFull,
  formatChartYAxisLabel,
  formatExpenseChartValue,
  showChartInfo,
  currency,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <DashboardSectionHeader
          title={t("dashboard.stats.charts.expensesOverTime")}
          inlineTrailing={
            <Pressable
              style={styles.infoIconButton}
              onPress={() => showChartInfo("expensesOverTime")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("dashboard.stats.chartInfo.open")}
            >
              <CircleHelp size={18} color={theme.colors.muted} />
            </Pressable>
          }
        />
        <View style={styles.legendInline}>
          <View style={styles.legendInlineItem}>
            <View
              style={[
                styles.legendInlineDot,
                { backgroundColor: theme.colors.accent },
              ]}
            />
            <Text style={[styles.legendInlineText, { color: theme.colors.fg }]}>
              {t("dashboard.stats.categories.fuel")}
            </Text>
          </View>
          <View style={styles.legendInlineItem}>
            <View
              style={[
                styles.legendInlineDot,
                { backgroundColor: theme.colors.muted },
              ]}
            />
            <Text style={[styles.legendInlineText, { color: theme.colors.fg }]}>
              {t("dashboard.tiles.serviceTitle")}
            </Text>
          </View>
        </View>
        <View style={styles.chartContainer} key={`bar-chart-${period}`}>
          {monthlyExpensesSeries.data.length === 0 ? (
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
                <SimpleStackedBarChart
                  data={monthlyExpensesSeries.data}
                  width={barChartWidth}
                  height={CHART_BAR_HEIGHT}
                  niceMaxY={barChartScale.niceMaxY}
                  yTicks={barChartScale.yTicks}
                  fuelFill={theme.colors.accent}
                  serviceFill={theme.colors.muted}
                  grid={theme.colors.border}
                  textColor={theme.colors.muted}
                  formatXLabel={formatChartMonth}
                  formatTooltipXLabel={formatChartMonthFull}
                  formatMoneyValue={formatExpenseChartValue}
                  currency={currency}
                  tooltipBg={theme.colors.card}
                  tooltipText={theme.colors.fg}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>
  );
}
