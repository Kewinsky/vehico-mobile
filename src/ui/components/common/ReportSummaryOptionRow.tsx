import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";

export type ReportSummaryStatus = "included" | "notIncluded" | "noData";

type Props = {
  label: string;
  status: ReportSummaryStatus;
  count?: number;
  value?: string;
  isLast?: boolean;
};

export function ReportSummaryOptionRow({
  label,
  status,
  count,
  value: customValue,
  isLast,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const value =
    status === "included"
      ? customValue != null
        ? customValue
        : count != null
          ? t("publicReport.includedWithCount", { count })
          : t("publicReport.included")
      : "–";
  const valueColor = value === "–" ? theme.colors.muted : theme.colors.accent;

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
