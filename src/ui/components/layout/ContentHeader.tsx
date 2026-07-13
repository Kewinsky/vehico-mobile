import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";

export type ContentHeaderProps = {
  title: string;
  subtitle?: string;
  filterPanel?: ReactNode;
};

export function ContentHeader({
  title,
  subtitle,
  filterPanel,
}: ContentHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle != null ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
      {filterPanel != null ? filterPanel : null}
    </>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerBlock: {
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
      paddingBottom: theme.spacing.sm,
    },
  });
