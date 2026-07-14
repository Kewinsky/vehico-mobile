import { Pressable, Text, View } from "react-native";
import { CircleHelp } from "lucide-react-native";

import { DashboardSectionHeader } from "../../components/DashboardSectionHeader";
import { StatTile } from "../components/StatTile";
import type { StatisticsPanelProps } from "../types";

export function OilChangeSection({
  styles,
  theme,
  t,
  isPremium,
  i18n,
  distanceUnitLabel,
  oilLastChangeShowDate,
  setOilLastChangeShowDate,
  lastOilChangeDateLabel,
  lastOilChange,
  oilAvgIntervalShowMonths,
  setOilAvgIntervalShowMonths,
  oilIntervals,
  showChartInfo,
  oilLife,
  oilLifeStatusText,
  oilLifeProgressPercent,
  oilLifeOverlayTextWidthPercent,
  fmtNumber,
  fmtMonths,
  groupThousands,
}: StatisticsPanelProps) {
  if (!isPremium) return null;

  return (
    <View style={styles.section}>
      <DashboardSectionHeader
        title={t("dashboard.stats.oilChange")}
        inlineTrailing={
          <Pressable
            style={styles.infoIconButton}
            onPress={() => showChartInfo("oilChange")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.stats.chartInfo.openOilSection")}
          >
            <CircleHelp size={18} color={theme.colors.muted} />
          </Pressable>
        }
      />
      <View style={styles.tilesRow}>
        <StatTile
          theme={theme}
          styles={styles}
          label={t("dashboard.stats.lastChange")}
          valueMain={
            oilLastChangeShowDate
              ? lastOilChangeDateLabel
              : lastOilChange?.mileage != null
                ? fmtNumber(lastOilChange.mileage, 0, i18n.language)
                : "–"
          }
          valueSuffix={
            !oilLastChangeShowDate && lastOilChange?.mileage != null
              ? distanceUnitLabel
              : undefined
          }
          onPress={() => setOilLastChangeShowDate((p) => !p)}
          accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
        />
        <StatTile
          theme={theme}
          styles={styles}
          label={t("dashboard.stats.avgInterval")}
          valueMain={
            oilAvgIntervalShowMonths
              ? Number.isFinite(oilIntervals.avgMonths)
                ? fmtMonths(oilIntervals.avgMonths, i18n.language)
                : "–"
              : Number.isFinite(oilIntervals.avgKm)
                ? fmtNumber(oilIntervals.avgKm, 0, i18n.language)
                : "–"
          }
          valueSuffix={
            oilAvgIntervalShowMonths
              ? Number.isFinite(oilIntervals.avgMonths)
                ? t("dashboard.stats.months")
                : undefined
              : Number.isFinite(oilIntervals.avgKm)
                ? distanceUnitLabel
                : undefined
          }
          onPress={() => setOilAvgIntervalShowMonths((p) => !p)}
          accessibilityHint={t("dashboard.stats.tapToSwitchUnit")}
        />
      </View>
      {oilLife ? (
        <View
          style={[styles.oilLifeCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.oilLifeTopRow}>
            <View style={styles.oilLifeTopCell}>
              <Text style={[styles.oilLifeLabel]}>
                {t("dashboard.stats.estNextShort")}
              </Text>
              <Text
                style={[styles.oilLifeMainValue, { color: theme.colors.fg }]}
              >
                {`${oilLife.remainingDays}d`}
              </Text>
            </View>
            <View style={styles.oilLifeTopCell}>
              <Text style={[styles.oilLifeLabel]}>
                {t("dashboard.stats.estRemaining")}
              </Text>
              <Text
                style={[styles.oilLifeMainValue, { color: theme.colors.fg }]}
              >
                {oilLife.remainingKm != null
                  ? `${groupThousands(oilLife.remainingKm, 0, i18n.language)} ${distanceUnitLabel}`
                  : `${oilLife.remainingDays}d`}
              </Text>
            </View>
          </View>

          <View style={styles.oilLifeProgressTrack}>
            <View
              style={[
                styles.oilLifeProgressFill,
                {
                  width: `${oilLifeProgressPercent}%`,
                  backgroundColor: oilLife.isOverdue
                    ? theme.colors.danger
                    : oilLife.isDueSoon
                      ? "#EAB308"
                      : theme.colors.accent,
                },
              ]}
            />
            <View pointerEvents="none" style={styles.oilLifeProgressTextLayer}>
              <Text
                style={[styles.oilLifeProgressText, { color: theme.colors.fg }]}
              >
                {oilLifeStatusText}
              </Text>
            </View>
            <View
              pointerEvents="none"
              style={[
                styles.oilLifeProgressTextOverlay,
                { width: `${oilLifeProgressPercent}%` },
              ]}
            >
              <View
                style={[
                  styles.oilLifeProgressTextOverlayInner,
                  { width: `${oilLifeOverlayTextWidthPercent}%` },
                ]}
              >
                <Text
                  style={[styles.oilLifeProgressText, { color: "#000000" }]}
                >
                  {oilLifeStatusText}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
