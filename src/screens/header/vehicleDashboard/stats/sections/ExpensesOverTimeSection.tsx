import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { VictoryExpensesStackedBarChart } from "../charts/VictoryExpensesStackedBarChart";
import type { StatisticsPanelProps } from "../types";

export function ExpensesOverTimeSection({
  styles,
  theme,
  t,
  period,
  monthlyExpensesSeries,
  formatChartMonth,
  formatChartMonthFull,
  formatChartYAxisLabel,
  formatExpenseChartValue,
  showChartInfo,
}: StatisticsPanelProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderInline}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.expensesOverTime")}
        </Text>
        <Pressable
          style={styles.infoIconButton}
          onPress={() => showChartInfo("expensesOverTime")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.stats.chartInfo.open")}
        >
          <CircleHelp size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
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
          <VictoryExpensesStackedBarChart
            data={monthlyExpensesSeries.data}
            fuelColor={theme.colors.accent}
            serviceColor={theme.colors.muted}
            mutedColor={theme.colors.muted}
            borderColor={theme.colors.border}
            cardColor={theme.colors.card}
            textColor={theme.colors.fg}
            fuelLabel={t("dashboard.stats.categories.fuel")}
            serviceLabel={t("dashboard.tiles.serviceTitle")}
            formatMonth={formatChartMonth}
            formatMonthFull={formatChartMonthFull}
            formatYLabel={formatChartYAxisLabel}
            formatValue={formatExpenseChartValue}
          />
        )}
      </View>
    </View>
  );
}
