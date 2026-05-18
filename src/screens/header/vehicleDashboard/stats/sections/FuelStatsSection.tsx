import { Pressable, Text, View } from "react-native";

import { StatTile } from "../components/StatTile";
import type { StatisticsPanelProps } from "../types";

export function FuelStatsSection({
  styles, theme, t, i18n, totals, rollingLocale, currency, consumptionUnitLine, fuelUnitShort, fuelUnitLabel, distanceUnitLabel, lastRefuelShowAmount, setLastRefuelShowAmount, canToggleLastRefuel, lastRefuelAmount, lastRefuelValueMain, lastRefuelValueSuffix, fuelStatsDistance, navigateToFuel, fmtNumber,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.fuelStats")}
          </Text>
          <Pressable onPress={navigateToFuel} hitSlop={8}>
            <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
              {t("dashboard.stats.viewAll")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.metrics.avgFuelConsumption")}
            valueMain={
              Number.isFinite(totals.avgConsumptionPer100)
                ? fmtNumber(totals.avgConsumptionPer100, 1, i18n.language)
                : "—"
            }
            valueSuffix={
              Number.isFinite(totals.avgConsumptionPer100)
                ? consumptionUnitLine
                : undefined
            }
            valueMainRollingValue={
              Number.isFinite(totals.avgConsumptionPer100)
                ? totals.avgConsumptionPer100
                : undefined
            }
            valueMainRollingLocale={rollingLocale}
            valueMainRollingToFixed={1}
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.avgCostPerUnit", { unit: fuelUnitShort })}
            valueMain={
              Number.isFinite(totals.avgCostPerLiter)
                ? fmtNumber(totals.avgCostPerLiter, 2, i18n.language)
                : "—"
            }
            valueSuffix={
              Number.isFinite(totals.avgCostPerLiter) ? currency : undefined
            }
            valueMainRollingValue={
              Number.isFinite(totals.avgCostPerLiter)
                ? totals.avgCostPerLiter
                : undefined
            }
            valueMainRollingLocale={rollingLocale}
            valueMainRollingToFixed={2}
          />
        </View>
        <View style={styles.tilesRow}>
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.lastRefuel")}
            valueMain={lastRefuelValueMain}
            valueSuffix={lastRefuelValueSuffix}
            valueMainRollingValue={
              lastRefuelShowAmount && Number.isFinite(lastRefuelAmount)
                ? lastRefuelAmount
                : undefined
            }
            valueMainRollingLocale={rollingLocale}
            valueMainRollingToFixed={0}
            onPress={
              canToggleLastRefuel
                ? () => setLastRefuelShowAmount((p) => !p)
                : undefined
            }
            accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
          />
          <StatTile
            theme={theme}
            styles={styles}
            label={t("dashboard.stats.metrics.totalDistance")}
            valueMain={
              fuelStatsDistance != null
                ? fmtNumber(fuelStatsDistance, 0, i18n.language)
                : "—"
            }
            valueSuffix={
              fuelStatsDistance != null ? distanceUnitLabel : undefined
            }
            valueMainRollingValue={fuelStatsDistance ?? undefined}
            valueMainRollingLocale={rollingLocale}
            valueMainRollingToFixed={0}
          />
        </View>
      </View>
  );
}
