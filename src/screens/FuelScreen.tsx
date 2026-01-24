import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { i18n } from "../i18n/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import {
  listFuelingEntries,
  deleteFuelingEntry,
} from "../services/fuel/fuelingEntriesRepo";
import { useCallback, useEffect, useState } from "react";
import type { FuelingEntry } from "../types/domain";
import { Button } from "../ui/components/Button";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "../ui/components/DateField";
import { TextField } from "../ui/components/TextField";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Fuel">;

import { formatMonthYear, formatMonthYearPL } from "../utils/dateFormatting";

export function FuelScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const f = await listFuelingEntries(route.params.vehicleId);
      setFueling(f);
    } catch (err: any) {
      toastError(err?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [route.params.vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const hasActiveFilters = useMemo(() => {
    return (
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      minCost.trim().length > 0 ||
      maxCost.trim().length > 0
    );
  }, [dateFrom, dateTo, minCost, maxCost]);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
  }

  const filteredFuelingWithSeparators = useMemo(() => {
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const filtered = fueling.filter((f) => {
      const d = String(f.date).slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (min != null) {
        const cost = Number(f.fuel_cost ?? 0);
        if (cost < min) return false;
      }
      if (max != null) {
        const cost = Number(f.fuel_cost ?? 0);
        if (cost > max) return false;
      }
      return true;
    });

    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => {
      const dateA = String(a.date).slice(0, 10);
      const dateB = String(b.date).slice(0, 10);
      return dateB.localeCompare(dateA);
    });

    // Group by month/year and add separators
    const grouped: Array<
      | { type: "separator"; monthYear: string; monthYearKey: string }
      | { type: "item"; item: FuelingEntry }
    > = [];
    let currentMonthYear: string | null = null;

    for (const entry of sorted) {
      const dateStr = String(entry.date).slice(0, 10);
      const monthYearKey = dateStr.slice(0, 7); // YYYY-MM

      if (monthYearKey !== currentMonthYear) {
        currentMonthYear = monthYearKey;
        grouped.push({
          type: "separator",
          monthYear: monthYearKey,
          monthYearKey,
        });
      }
      grouped.push({ type: "item", item: entry });
    }

    return grouped;
  }, [fueling, dateFrom, dateTo, minCost, maxCost]);

  function confirmDeleteFueling(id: string) {
    Alert.alert(
      t("fuelCosts.deleteFuelingTitle"),
      t("fuelCosts.deleteFuelingBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFuelingEntry(id);
              setFueling((prev) => prev.filter((x) => x.id !== id));
            } catch (err: any) {
              toastError(err?.message ?? t("common.error"));
            }
          },
        },
      ]
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("dashboard.tiles.fuelTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("dashboard.tiles.fuelSubtitle")}
          </Text>
        </View>
        <View style={{ height: theme.spacing.sm }} />
        <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button
                onPress={() =>
                  navigation.navigate("FuelingEntryForm", {
                    vehicleId: route.params.vehicleId,
                  })
                }
              >
                {t("fuelCosts.addFueling")}
              </Button>
            </View>
            <View style={{ marginLeft: theme.spacing.sm, flexDirection: "row", gap: theme.spacing.sm }}>
              <View
                style={[
                  styles.filterButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  hasActiveFilters && {
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setFiltersOpen((v) => !v)}
                  style={({ pressed }) => [
                    styles.filterButtonInner,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons
                    name="filter-outline"
                    size={24}
                    color={
                      hasActiveFilters ? theme.colors.accent : theme.colors.fg
                    }
                  />
                </Pressable>
              </View>
              {hasActiveFilters ? (
                <View
                  style={[
                    styles.filterButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <Pressable
                    onPress={resetFilters}
                    style={({ pressed }) => [
                      styles.filterButtonInner,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={24}
                      color={theme.colors.fg}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          {filtersOpen ? (
            <View
              style={[
                styles.filtersCard,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <DateField
                label={t("timeline.filterFrom")}
                value={dateFrom}
                onChange={setDateFrom}
              />
              <View style={{ height: 10 }} />
              <DateField
                label={t("timeline.filterTo")}
                value={dateTo}
                onChange={setDateTo}
              />

              <View style={{ height: theme.spacing.sm }} />
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t("timeline.filterMinCost")}
                    value={minCost}
                    onChangeText={setMinCost}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t("timeline.filterMaxCost")}
                    value={maxCost}
                    onChangeText={setMaxCost}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          ) : null}
      </View>
      <FlatList
        data={filteredFuelingWithSeparators}
        keyExtractor={(item, index) => {
          if (item.type === "separator") {
            return `separator-${item.monthYearKey}`;
          }
          return item.item.id;
        }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        ItemSeparatorComponent={({ leadingItem }) => {
          if (leadingItem && leadingItem.type === "separator") {
            return null;
          }
          return <View style={{ height: theme.spacing.sm }} />;
        }}
        renderItem={({ item }) => {
          if (item.type === "separator") {
            const monthYearText =
              i18n.language === "pl"
                ? formatMonthYearPL(item.monthYear + "-01")
                : formatMonthYear(item.monthYear + "-01");
            return (
              <View style={styles.separator}>
                <Text
                  style={[styles.separatorText, { color: theme.colors.muted }]}
                >
                  {monthYearText}
                </Text>
              </View>
            );
          }

          const entry = item.item;
          return (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    navigation.navigate("FuelingEntryForm", {
                      vehicleId: route.params.vehicleId,
                      entryId: entry.id,
                    })
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {entry.date}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: theme.spacing.xs / 2 }}>
                    {Number(entry.distance).toFixed(1)} {distanceUnit} ·{" "}
                    {Number(entry.fuel_amount).toFixed(1)} {fuelUnit} ·{" "}
                    {Number(entry.fuel_cost).toFixed(2)} {currency}
                  </Text>
                </Pressable>
                <IconButton
                  onPress={() => confirmDeleteFueling(entry.id)}
                  variant="danger"
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.danger}
                  />
                </IconButton>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}>
              {t("fuelCosts.noFueling")}
            </Text>
          )
        }
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    title: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    subtitle: { fontSize: 13, color: theme.colors.muted },
    body: { marginTop: theme.spacing.xs, lineHeight: 22 },
    section: { marginTop: theme.spacing.sm - 2, fontSize: 16, fontWeight: "800" },
    card: { borderWidth: 1, borderRadius: 14, padding: theme.spacing.sm },
    cardRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    filterButton: {
      width: 50,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    filterButtonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    filtersRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    filtersAction: {
      borderWidth: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.sm,
      alignSelf: "flex-start",
    },
    filtersCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    separator: {
      marginTop: theme.spacing.md + 4,
      marginBottom: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    separatorText: {
      fontSize: 14,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    loadingContainer: {
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
  });
