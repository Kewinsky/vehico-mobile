import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";

export type EmptyStateProps = {
  title?: string;
  body?: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {title != null ? <Text style={styles.title}>{title}</Text> : null}
      {body != null ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    body: {
      color: theme.colors.muted,
    },
  });
