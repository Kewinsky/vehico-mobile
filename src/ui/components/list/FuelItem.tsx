import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { formatShortDisplayDate } from "../../../utils/dateFormatting";

type FuelItemProps = {
  date: string;
  fuelTypeLabel?: string | null;
  stationLabel?: string | null;
  amount: number;
  fuelUnitLabel: string;
  cost: number;
  currency: string;
  onPress?: () => void;
};

export function FuelItem({
  date,
  fuelTypeLabel,
  stationLabel,
  amount,
  fuelUnitLabel,
  cost,
  currency,
  onPress,
}: FuelItemProps) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const formattedDate = formatShortDisplayDate(date, i18n.language);
  const details =
    [formattedDate, fuelTypeLabel, stationLabel].filter(Boolean).join(" · ") || "—";

  const content = (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text
          style={[styles.details, { color: theme.colors.muted }]}
          numberOfLines={1}
        >
          {details}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.valueWrap}>
          <Text style={styles.amountText}>{Number(amount).toFixed(1)}</Text>
          <Text style={styles.amountUnitText}> {fuelUnitLabel}</Text>
        </View>
        <View style={styles.valueWrap}>
          <Text style={[styles.costText, { color: theme.colors.fg }]}>
            {Number(cost).toFixed(2)}
          </Text>
          <Text style={styles.costCurrencyText}> {currency}</Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      gap: theme.spacing.xs,
    },
    details: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    amountText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    amountUnitText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.regular,
    },
    costText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    costCurrencyText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.regular,
    },
    valueWrap: {
      flexDirection: "row",
      alignItems: "baseline",
      minWidth: 0,
      flexShrink: 1,
    },
  });
