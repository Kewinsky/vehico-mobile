import { Text, View } from "react-native";

import { DashboardSection } from "../../components/DashboardSection";
import type { OverviewPanelProps } from "../types";

export function QuickMetricsSection({
  styles,
  theme,
  t,
  quickMetrics,
  currency,
  distanceUnitLabel,
}: Pick<
  OverviewPanelProps,
  "styles" | "theme" | "t" | "quickMetrics" | "currency" | "distanceUnitLabel"
>) {
  return (
    <DashboardSection>
      <View
        style={[styles.quickMetricsCard, { backgroundColor: theme.colors.card }]}
      >
        <View style={styles.quickMetricsRow}>
          <View style={styles.quickMetricCell}>
            <Text
              style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {quickMetrics.consumptionPrimary}
            </Text>
            <Text
              style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
              numberOfLines={2}
            >
              {quickMetrics.consumptionSecondary}
            </Text>
          </View>
          <View style={styles.quickMetricCell}>
            <Text
              style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {quickMetrics.costNumber}
              {quickMetrics.costShowCurrency ? (
                <Text
                  style={[
                    styles.quickMetricInlineUnit,
                    { color: theme.colors.muted },
                  ]}
                >
                  {` ${currency}`}
                </Text>
              ) : null}
            </Text>
            <Text
              style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
              numberOfLines={2}
            >
              {t("dashboard.quickMetrics.costSubtitle")}
            </Text>
          </View>
          <View style={styles.quickMetricCell}>
            <Text
              style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {quickMetrics.distanceNumber}
              {quickMetrics.distanceShowUnit ? (
                <Text
                  style={[
                    styles.quickMetricInlineUnit,
                    { color: theme.colors.muted },
                  ]}
                >
                  {` ${distanceUnitLabel}`}
                </Text>
              ) : null}
            </Text>
            <Text
              style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
              numberOfLines={2}
            >
              {t("dashboard.quickMetrics.distanceSubtitle")}
            </Text>
          </View>
          <View style={styles.quickMetricCell}>
            <Text
              style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {quickMetrics.remindersPrimary}
            </Text>
            <Text
              style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
              numberOfLines={2}
            >
              {t("dashboard.quickMetrics.alertsSubtitle")}
            </Text>
          </View>
        </View>
      </View>
    </DashboardSection>
  );
}
