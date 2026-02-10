import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { StatisticsCard } from "../ui/components/StatisticsCard";
import { hexToRgba } from "../ui/components/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "Statistics">;

type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";
type StatsTabKey = "metrics" | "charts" | "other";

export function StatisticsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const [period, setPeriod] = useState<PeriodKey>("3m");
  const [tab, setTab] = useState<StatsTabKey>("metrics");
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "1m", label: t("dashboard.stats.periods.1m") },
    { key: "3m", label: t("dashboard.stats.periods.3m") },
    { key: "6m", label: t("dashboard.stats.periods.6m") },
    { key: "1y", label: t("dashboard.stats.periods.1y") },
    { key: "all", label: t("dashboard.stats.periods.all") },
  ];

  const tabOptions: { key: StatsTabKey; label: string }[] = [
    { key: "metrics", label: t("dashboard.stats.tabs.metrics") },
    { key: "charts", label: t("dashboard.stats.tabs.charts") },
    { key: "other", label: t("dashboard.stats.tabs.other") },
  ];

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("dashboard.stats.title")}
          </Text>
          <View
            style={[
              styles.segmentWrap,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.bg,
              },
            ]}
          >
            {periodOptions.map((p) => {
              const selected = p.key === period;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.segmentSelected,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: selected ? accentBg : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentTextSmall,
                      {
                        color: selected
                          ? theme.colors.accent
                          : theme.colors.muted,
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.segmentWrap,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.bg,
              },
            ]}
          >
            {tabOptions.map((x) => {
              const selected = x.key === tab;
              return (
                <Pressable
                  key={x.key}
                  onPress={() => setTab(x.key)}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.segmentSelected,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: selected ? accentBg : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: selected
                          ? theme.colors.accent
                          : theme.colors.muted,
                      },
                    ]}
                  >
                    {x.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          {
            paddingHorizontal: theme.layout.contentPaddingHorizontal,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StatisticsCard
          vehicleId={route.params.vehicleId}
          period={period}
          tab={tab}
        />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingVertical: theme.spacing.md,
      marginHorizontal: theme.layout.contentPaddingHorizontal,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
    },
    segmentWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 2,
    },
    segment: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentSelected: {
      borderWidth: 1,
    },
    segmentText: {
      fontSize: theme.typography.small,
      fontWeight: "700",
    },
    segmentTextSmall: {
      fontSize: theme.typography.small,
      fontWeight: "700",
    },
  });
