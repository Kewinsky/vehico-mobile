import { Text, View } from "react-native";
import { Fuel } from "lucide-react-native";
import { AnimatedRollingNumber } from "react-native-animated-rolling-numbers";

import { StatTile } from "../components/StatTile";
import type { StatisticsPanelProps } from "../types";

export function ExpenseSummarySection({
  styles, theme, t, totals, rollingLocale, totalMain, fuelMain, serviceMain, currency,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <View
          style={[
            styles.tile,
            styles.tileFullWidth,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <View style={styles.expensesHeroRow}>
            <Text
              style={[styles.expensesHeroLabel, { color: theme.colors.accent }]}
              numberOfLines={1}
            >
              {t("dashboard.stats.metrics.totalExpenses")}
            </Text>
            <View style={styles.expensesHeroValueGroup}>
              {totals.total > 0 ? (
                <View style={styles.expensesHeroRollingWrap}>
                  <AnimatedRollingNumber
                    value={totals.total}
                    toFixed={totals.total >= 10 ? 0 : 1}
                    useGrouping
                    locale={rollingLocale}
                    spinningAnimationConfig={{ duration: 420 }}
                    textStyle={[
                      styles.expensesHeroValue,
                      { color: theme.colors.fg },
                    ]}
                  />
                </View>
              ) : (
                <Text
                  style={[styles.expensesHeroValue, { color: theme.colors.fg }]}
                  numberOfLines={1}
                >
                  {totalMain}
                </Text>
              )}
              {totalMain !== "—" ? (
                <Text
                  style={[
                    styles.expensesHeroCurrency,
                    { color: theme.colors.muted },
                  ]}
                  numberOfLines={1}
                >
                  {currency}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            layout="iconLeading"
            accessibilityLabel={t("dashboard.stats.categories.fuel")}
            iconComponent={<Fuel size={32} color={theme.colors.accent} />}
            valueMain={fuelMain}
            valueMainRollingValue={
              totals.fuelCost > 0 ? totals.fuelCost : undefined
            }
            valueMainRollingLocale={rollingLocale}
            valueSuffix={fuelMain !== "—" ? currency : undefined}
          />
          <StatTile
            theme={theme}
            styles={styles}
            layout="iconLeading"
            accessibilityLabel={t("dashboard.tiles.serviceTitle")}
            icon="construct"
            valueMain={serviceMain}
            valueMainRollingValue={
              totals.serviceCost > 0 ? totals.serviceCost : undefined
            }
            valueMainRollingLocale={rollingLocale}
            valueSuffix={serviceMain !== "—" ? currency : undefined}
          />
        </View>
      </View>
  );
}
