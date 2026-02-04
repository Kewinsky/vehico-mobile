import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { StatisticsCard } from "../ui/components/StatisticsCard";

type Props = NativeStackScreenProps<AppStackParamList, "Statistics">;

type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";

export function StatisticsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const [period, setPeriod] = useState<PeriodKey>("3m");

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "1m", label: t("dashboard.stats.periods.1m") },
    { key: "3m", label: t("dashboard.stats.periods.3m") },
    { key: "6m", label: t("dashboard.stats.periods.6m") },
    { key: "1y", label: t("dashboard.stats.periods.1y") },
    { key: "all", label: t("dashboard.stats.periods.all") },
  ];

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("dashboard.stats.title")}
          </Text>
          <View style={styles.periodRow}>
            {periodOptions.map((p) => {
              const active = p.key === period;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.card,
                    },
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#000000" : theme.colors.fg },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: theme.layout.contentPaddingHorizontal,
            paddingTop: theme.spacing.sm,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StatisticsCard vehicleId={route.params.vehicleId} period={period} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.titleMarginBottom,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    periodRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    chip: {
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    chipActive: {
      borderColor: theme.colors.accent,
    },
    chipPressed: { opacity: 0.92 },
    chipText: {
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    scrollContent: {},
  });
