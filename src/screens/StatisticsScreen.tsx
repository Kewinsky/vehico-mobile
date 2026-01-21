import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t("dashboard.stats.title")}</Text>
          <View style={styles.periodRow}>
            {periodOptions.map((p) => {
              const active = p.key === period;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    active ? styles.chipActive : null,
                    pressed ? styles.chipPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
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
        contentContainerStyle={styles.content}
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
      paddingHorizontal: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    periodRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    chipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    chipPressed: { opacity: 0.92 },
    chipText: { color: theme.colors.fg, fontSize: 12, fontWeight: "800" },
    chipTextActive: { color: "#000000" },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
  });

