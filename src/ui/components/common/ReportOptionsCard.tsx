import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../ThemeProvider";

type Props = {
  children: ReactNode;
};

export function ReportOptionsCard({ children }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return <View style={styles.card}>{children}</View>;
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
    },
  });
