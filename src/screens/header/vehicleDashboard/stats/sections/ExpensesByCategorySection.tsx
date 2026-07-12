import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { VictoryCategoryDonutChart } from "../charts/VictoryCategoryDonutChart";
import type { StatisticsPanelProps } from "../types";

export function ExpensesByCategorySection({
  styles,
  theme,
  t,
  isPremium,
  period,
  categorySeries,
  chartViewportWidth,
  isNarrow,
  legendShowPercent,
  setLegendShowPercent,
  visibleCategorySeries,
  totalByCategory,
  hasHiddenCategoryItems,
  showAllCategoryLegend,
  setShowAllCategoryLegend,
  showChartInfo,
  fmtPct,
  fmtMoney,
  currency,
}: StatisticsPanelProps) {
  if (!isPremium) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderInline}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("dashboard.stats.charts.expensesByCategory")}
        </Text>
        <Pressable
          style={styles.infoIconButton}
          onPress={() => showChartInfo("expensesByCategory")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.stats.chartInfo.open")}
        >
          <CircleHelp size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
      <View style={styles.chartContainer} key={`pie-chart-${period}`}>
        {categorySeries.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.muted }]}>
            {t("dashboard.stats.empty")}
          </Text>
        ) : (
          <View style={styles.pieChartWrap}>
            <VictoryCategoryDonutChart
              data={categorySeries.map((category) => ({
                label: category.label,
                value: category.value,
                color: category.color,
              }))}
              size={Math.min(chartViewportWidth - 48, isNarrow ? 220 : 260)}
            />
          </View>
        )}
      </View>
      {categorySeries.length > 0 ? (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.legendCard,
              { backgroundColor: theme.colors.card },
              pressed && styles.legendCardPressed,
            ]}
            onPress={() => setLegendShowPercent((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={t(
              "dashboard.stats.charts.expensesByCategory",
            )}
            accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
          >
            <View style={styles.legend}>
              {visibleCategorySeries.map((category) => {
                const pct =
                  totalByCategory > 0
                    ? (category.value / totalByCategory) * 100
                    : Number.NaN;
                return (
                  <View key={category.key} style={styles.legendRow}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Text
                      style={[styles.legendLabel, { color: theme.colors.fg }]}
                      numberOfLines={2}
                    >
                      {category.label}
                    </Text>
                    <View style={styles.legendValueWrap}>
                      {legendShowPercent ? (
                        <Text style={styles.legendValue}>{fmtPct(pct)}</Text>
                      ) : (
                        <Text style={styles.legendValue}>
                          {fmtMoney(category.value, currency)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Pressable>
          {hasHiddenCategoryItems ? (
            <Pressable
              onPress={() => setShowAllCategoryLegend((prev) => !prev)}
              hitSlop={8}
              style={styles.legendExpandButton}
            >
              <Text
                style={[styles.viewAllLink, { color: theme.colors.accent }]}
              >
                {showAllCategoryLegend
                  ? t("dashboard.stats.showFewerCategories")
                  : t("dashboard.stats.showMoreCategories")}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
