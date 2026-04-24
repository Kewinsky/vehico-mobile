import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

type ServiceItemProps = {
  title: string;
  date?: string | null;
  mileage?: number | null;
  distanceUnit: string;
  workshopName?: string | null;
  cost?: number | null;
  currency: string;
  icon?: ReactNode;
  iconBackgroundColor?: string;
  onPress?: () => void;
};

export function ServiceItem({
  title,
  date,
  mileage,
  distanceUnit,
  workshopName,
  cost,
  currency,
  icon,
  iconBackgroundColor,
  onPress,
}: ServiceItemProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = makeStyles(theme);
  const distanceUnitLabel =
    distanceUnit === "miles"
      ? t("settings.distanceUnitMiles")
      : t("settings.distanceUnitKm");

  const formattedDate = date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    : "—";
  const mileageText =
    mileage != null ? `${mileage.toLocaleString()} ${distanceUnitLabel}` : "—";
  const costText = cost != null ? `${cost.toLocaleString()} ${currency}` : "—";

  const content = (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {icon ? (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: iconBackgroundColor ?? "rgba(107,114,128,0.1)",
              },
            ]}
          >
            {icon}
          </View>
        ) : null}

        <View style={styles.main}>
          <Text
            style={[styles.title, { color: theme.colors.fg }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.meta, { color: theme.colors.muted }]}
            numberOfLines={1}
          >
            {formattedDate} · {mileageText}
          </Text>
        </View>

        <Text style={[styles.costValue, { color: theme.colors.accent }]}>
          {costText}
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
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    meta: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
    },
    rowValue: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    costValue: {
      marginLeft: "auto",
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
  });
