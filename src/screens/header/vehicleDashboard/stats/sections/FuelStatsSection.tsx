import { Pressable, Text, View } from "react-native";

import { StatTile } from "../components/StatTile";
import type { StatisticsPanelProps } from "../types";

export function FuelStatsSection({
  styles,
  theme,
  t,
  totals,
  currency,
  consumptionUnitLine,
  fuelUnitShort,
  fuelUnitLabel,
  distanceUnitLabel,
  lastRefuelShowAmount,
  setLastRefuelShowAmount,
  canToggleLastRefuel,
  lastRefuelAmount,
  lastRefuelValueMain,
  lastRefuelValueSuffix,
  fuelStatsDistance,
  navigateToFuel,
  formatStatNumber,
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
              ? formatStatNumber(totals.avgConsumptionPer100, 1)
              : "–"
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
        />
        <StatTile
          theme={theme}
          styles={styles}
          label={t("dashboard.stats.avgCostPerUnit", { unit: fuelUnitShort })}
          valueMain={
            Number.isFinite(totals.avgCostPerLiter)
              ? formatStatNumber(totals.avgCostPerLiter, 2)
              : "–"
          }
          valueSuffix={
            Number.isFinite(totals.avgCostPerLiter) ? currency : undefined
          }
          valueMainRollingValue={
            Number.isFinite(totals.avgCostPerLiter)
              ? totals.avgCostPerLiter
              : undefined
          }
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
              ? formatStatNumber(fuelStatsDistance, 0)
              : "–"
          }
          valueSuffix={
            fuelStatsDistance != null ? distanceUnitLabel : undefined
          }
          valueMainRollingValue={fuelStatsDistance ?? undefined}
        />
      </View>
    </View>
  );
}
