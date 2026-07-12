import { useMemo } from "react";
import { Text, View } from "react-native";
import { Fuel, Wrench } from "lucide-react-native";

import { hexToRgba } from "../../../../../ui/components/common/ChoiceChip";
import { SERVICE_CATEGORY_ICON_BACKGROUND } from "../../../../../ui/theme/serviceCategoryColors";
import type { StatisticsPanelProps } from "../types";

function formatSummaryAmount(
  formatStatNumber: (value: number, fractionDigits: number) => string,
  value: number,
) {
  if (!Number.isFinite(value) || value <= 0) {
    return formatStatNumber(0, 0);
  }
  return formatStatNumber(
    value >= 10 ? Math.round(value) : value,
    value >= 10 ? 0 : 1,
  );
}

function ExpenseAmount({
  formatted,
  textStyle,
}: {
  formatted: string;
  textStyle: object;
}) {
  return (
    <Text style={textStyle} numberOfLines={1}>
      {formatted}
    </Text>
  );
}

export function ExpenseSummarySection({
  styles,
  theme,
  t,
  totals,
  formatStatNumber,
  fmtPct,
  currency,
}: StatisticsPanelProps) {
  const fuelMain = useMemo(
    () => formatSummaryAmount(formatStatNumber, totals.fuelCost),
    [formatStatNumber, totals.fuelCost],
  );
  const serviceMain = useMemo(
    () => formatSummaryAmount(formatStatNumber, totals.serviceCost),
    [formatStatNumber, totals.serviceCost],
  );

  const fuelSharePct =
    totals.total > 0 ? (totals.fuelCost / totals.total) * 100 : 0;
  const serviceSharePct =
    totals.total > 0 ? (totals.serviceCost / totals.total) * 100 : 0;

  const breakdownStyles = useMemo(
    () => ({
      fuelBg: SERVICE_CATEGORY_ICON_BACKGROUND.fuel,
      serviceBg: hexToRgba(theme.colors.muted, 0.12),
      fuelColor: theme.colors.accent,
      serviceColor: theme.colors.muted,
    }),
    [theme.colors.accent, theme.colors.muted],
  );

  return (
    <View style={styles.section}>
      <View style={styles.expenseSummaryBreakdownRow}>
        <View
          style={[
            styles.expenseSummaryBreakdownCell,
            { backgroundColor: breakdownStyles.fuelBg },
          ]}
        >
          <View style={styles.expenseSummaryBreakdownHeader}>
            <View
              style={[
                styles.expenseSummaryIconBadge,
                { backgroundColor: hexToRgba(theme.colors.accent, 0.18) },
              ]}
            >
              <Fuel size={18} color={breakdownStyles.fuelColor} />
            </View>
            <ExpenseAmount
              formatted={fmtPct(fuelSharePct)}
              textStyle={[
                styles.expenseSummaryShareLabel,
                { color: theme.colors.muted },
              ]}
            />
          </View>
          <Text
            style={[
              styles.expenseSummaryBreakdownLabel,
              { color: theme.colors.muted },
            ]}
            numberOfLines={1}
          >
            {t("dashboard.stats.categories.fuel")}
          </Text>
          <View style={styles.expenseSummaryBreakdownValueRow}>
            <ExpenseAmount
              formatted={fuelMain}
              textStyle={[
                styles.expenseSummaryBreakdownValue,
                { color: theme.colors.fg },
              ]}
            />
            {currency ? (
              <Text
                style={[
                  styles.expenseSummaryBreakdownSuffix,
                  { color: theme.colors.muted },
                ]}
                numberOfLines={1}
              >
                {currency}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.expenseSummaryBreakdownCell,
            { backgroundColor: breakdownStyles.serviceBg },
          ]}
        >
          <View style={styles.expenseSummaryBreakdownHeader}>
            <View
              style={[
                styles.expenseSummaryIconBadge,
                { backgroundColor: hexToRgba(theme.colors.muted, 0.18) },
              ]}
            >
              <Wrench size={18} color={breakdownStyles.serviceColor} />
            </View>
            <ExpenseAmount
              formatted={fmtPct(serviceSharePct)}
              textStyle={[
                styles.expenseSummaryShareLabel,
                { color: theme.colors.muted },
              ]}
            />
          </View>
          <Text
            style={[
              styles.expenseSummaryBreakdownLabel,
              { color: theme.colors.muted },
            ]}
            numberOfLines={1}
          >
            {t("dashboard.stats.categories.service")}
          </Text>
          <View style={styles.expenseSummaryBreakdownValueRow}>
            <ExpenseAmount
              formatted={serviceMain}
              textStyle={[
                styles.expenseSummaryBreakdownValue,
                { color: theme.colors.fg },
              ]}
            />
            {currency ? (
              <Text
                style={[
                  styles.expenseSummaryBreakdownSuffix,
                  { color: theme.colors.muted },
                ]}
                numberOfLines={1}
              >
                {currency}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
