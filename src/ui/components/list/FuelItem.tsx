import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const formattedDate = date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    : "—";
  const details =
    [formattedDate, stationLabel].filter(Boolean).join(" · ") || "—";
  const amountWithType = fuelTypeLabel
    ? `${Number(amount).toFixed(1)} ${fuelUnitLabel} (${fuelTypeLabel})`
    : `${Number(amount).toFixed(1)} ${fuelUnitLabel}`;

  const content = (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text
          style={[styles.details, { color: theme.colors.fg }]}
          numberOfLines={1}
        >
          {details}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.amountText}>{amountWithType}</Text>
        <Text style={[styles.costText, { color: theme.colors.accent }]}>
          {Number(cost).toFixed(2)} {currency}
        </Text>
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
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 2,
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
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: "#0B0B0B",
    },
    costText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
  });
