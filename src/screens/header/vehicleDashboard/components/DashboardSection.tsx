import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

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
        title ? (
          <DashboardSectionHeader title={title} right={headerRight} />
        ) : (
          <View style={styles.sectionHeaderRow}>
            <View style={styles.headerSpacer} />
            {headerRight}
          </View>
        )
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
    headerSpacer: {
      flex: 1,
    },
  });
