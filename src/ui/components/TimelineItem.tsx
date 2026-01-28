import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export function TimelineItem({
  title,
  subtitle,
  badge,
  badgeVariant = "accent",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "accent" | "muted";
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const isMutedBadge = badgeVariant === "muted";
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardMain}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>

              {badge && (
                <View
                  style={[
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

            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.muted}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 12,
    },
    card: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    cardMain: {
      flex: 1,
      gap: 6,
    },
    badge: {
      paddingHorizontal: 5,
      paddingVertical: 2,
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
      fontSize: theme.typography.small,
      fontWeight: "700",
      color: "#000000",
      letterSpacing: 0.3,
    },
    badgeTextMuted: {
      color: "#000000",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      lineHeight: 18,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
  });
