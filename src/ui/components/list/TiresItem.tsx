import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Trash2, Undo2 } from "lucide-react-native";
import type Swipeable from "react-native-gesture-handler/Swipeable";
import { ExclusiveSwipeable } from "../common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../common/SwipeActions";
import { useTranslation } from "react-i18next";

import type { VehicleTire } from "../../../types/domain";
import { formatTireDimensions } from "../../../services/tires/tiresRepo";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

export type TiresItemProps = {
  tire: VehicleTire;
  onPress?: () => void;
  onToggleInUse?: () => void;
  onDelete?: () => void;
};

export function TiresItem({
  tire,
  onPress,
  onToggleInUse,
  onDelete,
}: TiresItemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const swipeableRef = useRef<Swipeable | null>(null);
  const subtitle = (() => {
    const dims = formatTireDimensions(
      tire.width_mm,
      tire.aspect_ratio,
      tire.diameter_inch,
    );
    const typeLabel = t(`tireForm.types.${tire.tire_type}`);
    const parts = [dims, typeLabel];
    if (tire.dot?.trim()) parts.push(`DOT ${tire.dot.trim()}`);
    return parts.join(" · ");
  })();

  const content = (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Text
                style={[styles.title, { color: theme.colors.fg }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tire.name}
              </Text>
            </View>
            {tire.is_currently_fitted && (
              <View
                style={[styles.badgeWrap, styles.badge, styles.badgeAccent]}
              >
                <Text style={styles.badgeText}>
                  {t("wheels.currentlyFitted")}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.subtitle, { color: theme.colors.muted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
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

  if (!onToggleInUse && !onDelete) return baseContent;

  const swipeActions = [
    ...(onToggleInUse
      ? [
          {
            onPress: () => {
              swipeableRef.current?.close();
              onToggleInUse();
            },
            color: tire.is_currently_fitted
              ? theme.colors.muted
              : theme.colors.accent,
            icon: tire.is_currently_fitted ? (
              <Undo2 size={22} color="#000000" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#000000" />
            ),
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            onPress: onDelete,
            color: theme.colors.danger,
            icon: <Trash2 size={20} color="#000000" />,
          },
        ]
      : []),
  ];

  return (
    <ExclusiveSwipeable
      ref={swipeableRef}
      rightThreshold={32}
      renderRightActions={(progress) => (
        <SwipeActionsRow progress={progress} actions={swipeActions} />
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
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.sm / 2,
    },
    badge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: 999,
    },
    badgeAccent: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    badgeText: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: "#000000",
      letterSpacing: 0.3,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm / 2,
      alignSelf: "flex-start",
      maxWidth: "100%",
      minWidth: 0,
    },
    titleWrap: {
      flexShrink: 1,
      minWidth: 0,
    },
    badgeWrap: {
      flexShrink: 0,
    },
  });
