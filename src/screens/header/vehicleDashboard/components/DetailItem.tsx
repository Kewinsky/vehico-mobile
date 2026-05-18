import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

type DetailItemProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

export function DetailItem({ icon, label, value }: DetailItemProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.detailItem}>
      {icon}
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    detailContent: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    detailLabel: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
  });
