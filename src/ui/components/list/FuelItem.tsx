import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { ExclusiveSwipeable } from "../common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../common/SwipeActions";
import { useTranslation } from "react-i18next";

import { useUnitDisplay } from "../../../app/hooks/useUnitDisplay";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { formatShortDisplayDate } from "../../../utils/dateFormatting";
import { computeTripConsumption } from "../../../utils/unitGroups";

type FuelItemProps = {
  date: string;
  fuelTypeLabel?: string | null;
  stationLabel?: string | null;
  amount: number;
  fuelUnitLabel: string;
  cost: number;
  currency: string;
  /** Trip distance for this fill-up; when set with amount, shows avg consumption. */
  distance?: number | null;
  onPress?: () => void;
  onDelete?: () => void;
};

function Metric({
  icon,
  iconColor,
  value,
  unit,
  valueColor,
  unitColor,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  unit: string;
  valueColor: string;
  unitColor: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <View style={styles.metricTextWrap}>
        <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.metricUnit, { color: unitColor }]} numberOfLines={1}>
          {" "}
          {unit}
        </Text>
      </View>
    </View>
  );
}

export function FuelItem({
  date,
  fuelTypeLabel,
  stationLabel,
  amount,
  fuelUnitLabel,
  cost,
  currency,
  distance,
  onPress,
  onDelete,
}: FuelItemProps) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { unitGroup, consumptionUnitLine } = useUnitDisplay();
  const styles = makeStyles(theme);
  const formattedDate = formatShortDisplayDate(date, i18n.language);
  const details =
    [formattedDate, fuelTypeLabel, stationLabel].filter(Boolean).join(" · ") ||
    "–";

  const consumption = computeTripConsumption({
    unitGroup,
    fuelAmount: amount,
    distance: distance ?? null,
  });

  const content = (
    <View style={styles.card}>
      <Text
        style={[styles.details, { color: theme.colors.muted }]}
        numberOfLines={1}
      >
        {details}
      </Text>

      <View style={styles.metricsRow}>
        <Metric
          icon="water"
          iconColor="#0ea5e9"
          value={Number(amount).toFixed(1)}
          unit={fuelUnitLabel}
          valueColor={theme.colors.fg}
          unitColor={theme.colors.muted}
          styles={styles}
        />
        {consumption != null ? (
          <Metric
            icon="speedometer-outline"
            iconColor={theme.colors.accent}
            value={consumption.toFixed(1)}
            unit={consumptionUnitLine}
            valueColor={theme.colors.fg}
            unitColor={theme.colors.muted}
            styles={styles}
          />
        ) : null}
        <Metric
          icon="cash-outline"
          iconColor="#22c55e"
          value={Number(cost).toFixed(2)}
          unit={currency}
          valueColor={theme.colors.fg}
          unitColor={theme.colors.muted}
          styles={styles}
        />
      </View>
    </View>
  );

  const baseContent = onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );

  if (!onDelete) return baseContent;

  return (
    <ExclusiveSwipeable
      rightThreshold={32}
      renderRightActions={(progress) => (
        <SwipeActionsRow
          progress={progress}
          actions={[
            {
              onPress: onDelete,
              color: theme.colors.danger,
              icon: <Trash2 size={20} color="#000000" />,
            },
          ]}
        />
      )}
    >
      {baseContent}
    </ExclusiveSwipeable>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      gap: theme.spacing.sm,
    },
    details: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
    },
    metricsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    metric: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    metricTextWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      minWidth: 0,
      flexShrink: 1,
    },
    metricValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    metricUnit: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
