import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../common/Button";
import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "../common/ChoiceChip";

export type DashboardCalloutAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outlined" | "ghost";
  disabled?: boolean;
  loading?: boolean;
};

type DashboardCalloutCardProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  meta?: string;
  actions: DashboardCalloutAction[];
  /** Card tint and default button color. */
  accentColor?: string;
  /** Button color when different from card accent (e.g. accent buttons on blue card). */
  buttonColor?: string;
};

export function DashboardCalloutCard({
  icon,
  title,
  description,
  meta,
  actions,
  accentColor,
  buttonColor,
}: DashboardCalloutCardProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const accent = accentColor ?? theme.colors.accent;
  const actionColor = buttonColor ?? accent;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: hexToRgba(accent, 0.14) },
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.top}>
        {icon}
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: theme.colors.muted }]}>
              {description}
            </Text>
          ) : null}
          {meta ? (
            <Text style={[styles.meta, { color: theme.colors.muted }]}>{meta}</Text>
          ) : null}
        </View>
      </View>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Button
              key={`${action.label}-${index}`}
              onPress={action.onPress}
              variant={action.variant ?? (index === 0 ? "primary" : "outlined")}
              color={actionColor}
              disabled={action.disabled}
              loading={action.loading}
              style={actions.length > 1 ? styles.actionButton : undefined}
            >
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: {
  spacing: { xs: number; sm: number; md: number };
  typography: { body: number; small: number; fontWeight: { bold: string } };
  radius: { md: number };
}) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
    },
    meta: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
