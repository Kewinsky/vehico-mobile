import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../ThemeProvider";

export type ContentHeaderProps = {
  title: string;
  filterPanel?: ReactNode;
};

export function ContentHeader({ title, filterPanel }: ContentHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {filterPanel != null ? (
        <View style={styles.panelBlock}>{filterPanel}</View>
      ) : null}
    </>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerBlock: {
      paddingVertical: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    panelBlock: {
      paddingBottom: theme.spacing.sm,
    },
  });
