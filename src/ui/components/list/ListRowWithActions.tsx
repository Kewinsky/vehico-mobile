import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

export type ListRowWithActionsProps = {
  title: string;
  subtitle?: string;
  /** Press handler for the main content (title + subtitle). */
  onPress?: () => void;
  /** Trailing content (e.g. IconButtons for edit, delete, toggle). */
  trailing?: ReactNode;
  /** When true, title and subtitle are dimmed (e.g. for "done" or disabled state). */
  muted?: boolean;
  /** When true, the whole card is dimmed (e.g. opacity 0.6 for completed items). */
  dimmed?: boolean;
  /** Match `Button` row height (single- or two-line content, vertically centered). */
  compact?: boolean;
};

export function ListRowWithActions({
  title,
  subtitle,
  onPress,
  trailing,
  muted,
  dimmed,
  compact,
}: ListRowWithActionsProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const titleColor = muted ? theme.colors.muted : theme.colors.fg;
  const subtitleColor = theme.colors.muted;

  const mainContent = (
    <>
      <Text
        style={[styles.title, { color: titleColor }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={[
            styles.subtitle,
            compact && styles.subtitleCompact,
            { color: subtitleColor },
            muted && styles.subtitleMuted,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        dimmed && styles.cardDimmed,
      ]}
    >
      <View style={styles.row}>
        {onPress ? (
          <Pressable style={{ flex: 1, minWidth: 0 }} onPress={onPress}>
            {mainContent}
          </Pressable>
        ) : (
          <View style={styles.mainWrap}>{mainContent}</View>
        )}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    cardCompact: {
      height: theme.spacing.lg * 2,
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
    },
    cardDimmed: {
      opacity: 0.6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    mainWrap: {
      flex: 1,
      minWidth: 0,
    },
    trailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
    subtitleCompact: {
      marginTop: 2,
    },
    subtitleMuted: {
      opacity: 0.6,
    },
  });
