import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { i18n } from "../../i18n/i18n";
import { formatMonthYear, formatMonthYearPL } from "../../utils/dateFormatting";
import { useTheme } from "../ThemeProvider";

type Props = { monthYear: string };

/**
 * Displays a month+year section label (e.g. "STYCZEŃ 2024").
 * Use in FlatList ItemSeparatorComponent or ListHeaderComponent when grouping by month/year.
 */
export function MonthYearSeparator({ monthYear }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const text =
    i18n.language === "pl"
      ? formatMonthYearPL(monthYear + "-01")
      : formatMonthYear(monthYear + "-01");
  return (
    <View style={styles.separator}>
      <Text style={[styles.separatorText, { color: theme.colors.muted }]}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    separator: {
      marginTop: theme.spacing.sm,
    },
    separatorText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
