import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";

export type TimelineItemProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "accent" | "muted";
  icon?: ReactNode;
  /** Pastel tile behind icon (same idea as web timeline9). Defaults to neutral gray when icon is set. */
  iconBackgroundColor?: string;
  onPress?: () => void;
};

export function TimelineItem({
  title,
  subtitle,
  badge,
  badgeVariant = "accent",
  icon,
  iconBackgroundColor,
  onPress,
}: TimelineItemProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const isMutedBadge = badgeVariant === "muted";

  const content = (
    <View style={styles.card}>
      <View style={styles.content}>
        {icon ? (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  iconBackgroundColor ?? "rgba(107,114,128,0.1)",
              },
            ]}
          >
            {icon}
          </View>
        ) : null}
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Text
                style={[styles.title, { color: theme.colors.fg }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            </View>
            {badge && (
              <View
                style={[
                  styles.badgeWrap,
                  styles.badge,
                  isMutedBadge ? styles.badgeMuted : styles.badgeAccent,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isMutedBadge ? styles.badgeTextMuted : null,
                  ]}
                >
                  {badge}
                </Text>
              </View>
            )}
          </View>
          {!!subtitle && (
            <Text
              style={[styles.subtitle, { color: theme.colors.muted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={22}
          color={theme.colors.accent}
        />
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
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
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
    badgeMuted: {
      borderColor: theme.colors.muted,
      backgroundColor: theme.colors.muted,
    },
    badgeText: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: "#000000",
      letterSpacing: 0.3,
    },
    badgeTextMuted: {
      color: "#000000",
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
