import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTranslation } from "react-i18next";

import { useUnitDisplay } from "../../../app/hooks/useUnitDisplay";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { formatShortDisplayDate } from "../../../utils/dateFormatting";
import { groupThousands } from "../../../utils/numberFormatting";

type ServiceItemProps = {
  title: string;
  date?: string | null;
  mileage?: number | null;
  workshopName?: string | null;
  cost?: number | null;
  currency: string;
  icon?: ReactNode;
  iconBackgroundColor?: string;
  onPress?: () => void;
  onDelete?: () => void;
};

export function ServiceItem({
  title,
  date,
  mileage,
  workshopName,
  cost,
  currency,
  icon,
  iconBackgroundColor,
  onPress,
  onDelete,
}: ServiceItemProps) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { distanceUnitLabel } = useUnitDisplay();
  const styles = makeStyles(theme);

  const formattedDate =
    date != null && String(date).trim().length > 0
      ? formatShortDisplayDate(date, i18n.language)
      : null;
  const mileageText =
    mileage != null
      ? `${groupThousands(mileage, 0, i18n.language)} ${distanceUnitLabel}`
      : null;
  const costMain =
    cost != null ? groupThousands(cost, 0, i18n.language) : "—";
  const hasCost = cost != null;

  const metaParts: string[] = [];
  if (formattedDate != null && formattedDate !== "—") {
    metaParts.push(formattedDate);
  }
  if (mileageText != null) {
    metaParts.push(mileageText);
  }
  const metaLine = metaParts.join(" · ");

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
          {metaLine.length > 0 ? (
            <Text
              style={[styles.meta, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {metaLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.costWrap}>
          <Text style={[styles.costValue, { color: theme.colors.fg }]}>
            {costMain}
          </Text>
          {hasCost ? (
            <Text style={[styles.costCurrency, { color: theme.colors.muted }]}>
              {" "}
              {currency}
            </Text>
          ) : null}
        </View>
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
    <Swipeable
      rightThreshold={32}
      renderRightActions={() => (
        <View style={styles.swipeActionsWrap}>
          <Pressable
            onPress={onDelete}
            style={[styles.swipeActionBtn, { backgroundColor: theme.colors.danger }]}
          >
            <Trash2 size={20} color="#000000" />
          </Pressable>
        </View>
      )}
    >
      {baseContent}
    </Swipeable>
  );
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
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    costWrap: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "baseline",
    },
    costCurrency: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.regular,
    },
    swipeActionsWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginLeft: theme.spacing.xs,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    swipeActionBtn: {
      width: 72,
      alignItems: "center",
      justifyContent: "center",
    },
  });
