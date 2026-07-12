import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { VictoryMileageLineChart } from "../charts/VictoryMileageLineChart";
import type { StatisticsPanelProps } from "../types";

export function MileageOverTimeChartSection({
  styles,
  theme,
  t,
  isPremium,
  period,
  mileageOverTimeSeries,
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
          <VictoryMileageLineChart
            data={mileageOverTimeSeries}
            accentColor={theme.colors.accent}
            mutedColor={theme.colors.muted}
            borderColor={theme.colors.border}
            cardColor={theme.colors.card}
            textColor={theme.colors.fg}
            formatMonth={formatChartMonth}
            formatMonthFull={formatChartMonthFull}
            formatYLabel={formatChartYAxisLabel}
            formatValue={formatMileageChartValue}
          />
        )}
      </View>
    </View>
  );
}
