import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

type DashboardSectionProps = {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function DashboardSection({
  title,
  headerRight,
  children,
}: DashboardSectionProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.sectionBlock}>
      {title || headerRight ? (
        <View style={styles.sectionHeaderRow}>
          {title ? (
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {title}
            </Text>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          {headerRight}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    sectionBlock: {
      gap: theme.spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      flex: 1,
    },
    headerSpacer: {
      flex: 1,
    },
  });
