import { StyleSheet, View } from "react-native";
import type { ViewProps, ViewStyle } from "react-native";
import { useMemo } from "react";

import { useTheme } from "../ThemeProvider";

type CardProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
};

export function Card({ style, ...rest }: CardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        },
        style,
      ]}
    />
  );
}

export function CardDivider() {
  const { theme } = useTheme();
  return <View style={{ height: 1, width: "100%", backgroundColor: theme.colors.border }} />;
}

type CardRowProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
};

export function CardRow({ style, ...rest }: CardRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <View {...rest} style={[styles.row, style]} />;
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
  });

