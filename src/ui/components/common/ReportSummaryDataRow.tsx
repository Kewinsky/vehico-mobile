import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";

const EMPTY_VALUE = "–";

type Props = {
  label: string;
  value: string;
  isLast?: boolean;
};

export function ReportSummaryDataRow({ label, value, isLast }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const valueColor =
    value === EMPTY_VALUE ? theme.colors.muted : theme.colors.accent;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    rowLast: {
      marginBottom: 0,
    },
    label: {
      flex: 1,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
    value: {
      flexShrink: 0,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
  });
