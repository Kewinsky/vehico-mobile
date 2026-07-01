import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { SimplePieChart } from "../charts/charts";
import type { StatisticsPanelProps } from "../types";

export function ExpensesByCategorySection({
  styles,
  theme,
  t,
  isPremium,
  period,
  categorySeries, chartViewportWidth, isNarrow, legendShowPercent, setLegendShowPercent, visibleCategorySeries, totalByCategory, hasHiddenCategoryItems, showAllCategoryLegend, setShowAllCategoryLegend, showChartInfo, fmtPct, fmtMoney, currency,
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
              <SimplePieChart
                data={categorySeries.map((c) => ({
                  label: c.label,
                  value: c.value,
                }))}
                size={Math.min(chartViewportWidth - 48, isNarrow ? 220 : 260)}
                colors={categorySeries.map((c) => c.color)}
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
                {visibleCategorySeries.map((c) => {
                  const pct =
                    totalByCategory > 0
                      ? (c.value / totalByCategory) * 100
                      : Number.NaN;
                  return (
                    <View key={c.key} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, { backgroundColor: c.color }]}
                      />
                      <Text
                        style={[styles.legendLabel, { color: theme.colors.fg }]}
                        numberOfLines={2}
                      >
                        {c.label}
                      </Text>
                      <View style={styles.legendValueWrap}>
                        {legendShowPercent ? (
                          <Text style={styles.legendValue}>{fmtPct(pct)}</Text>
                        ) : (
                          <Text style={styles.legendValue}>
                            {fmtMoney(c.value, currency)}
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
