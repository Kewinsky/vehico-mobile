import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { i18n } from "../i18n/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type {
  Reminder,
  ServiceEntry,
  ServiceEntryCategory,
  Vehicle,
} from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { TimelineItem } from "../ui/components/TimelineItem";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { TextField } from "../ui/components/TextField";
import { DateField } from "../ui/components/DateField";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDetail">;

function formatDate(iso: string) {
  // Keep simple (trustworthy, document-like): YYYY-MM-DD
  return iso.slice(0, 10);
}

function formatMonthYear(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

function formatMonthYearPL(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

export function VehicleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const currency = settings?.currency ?? "PLN";

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | ServiceEntryCategory
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [showReminders, setShowReminders] = useState(true);

  const load = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      try {
        if (opts?.refreshing) setRefreshing(true);
        else setLoading(true);
        const [v, data, rs] = await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listReminders(vehicleId),
        ]);
        setVehicle(v);
        setItems(data);
        setReminders(rs);
      } catch (e: any) {
        toastError(t("common.error"), e?.message ?? String(e));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [vehicleId, t]
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const hasActiveFilters = useMemo(() => {
    return (
      categoryFilter !== "all" ||
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      minCost.trim().length > 0 ||
      maxCost.trim().length > 0 ||
      !showReminders
    );
  }, [categoryFilter, dateFrom, dateTo, minCost, maxCost, showReminders]);

  function resetFilters() {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setShowReminders(true);
  }

  const timelineRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const serviceRows = items
      .filter((e) => {
        const cat = (e.category ?? "other") as ServiceEntryCategory;
        if (categoryFilter !== "all" && cat !== categoryFilter) return false;
        const d = String(e.service_date).slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (min != null) {
          if (e.cost == null) return false;
          if (Number(e.cost) < min) return false;
        }
        if (max != null) {
          if (e.cost == null) return false;
          if (Number(e.cost) > max) return false;
        }
        if (q.length) {
          const hay = `${e.title ?? ""}\n${e.description ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((e) => ({
        kind: "service" as const,
        id: e.id,
        sortKey: String(e.service_date).slice(0, 10),
        entry: e,
      }));

    const reminderRows = showReminders
      ? reminders
          .filter((r) => {
            // Only show active reminders
            if (r.status !== "active") return false;
            const sortKey =
              r.type === "mileage"
                ? "9999-12-31"
                : String(r.due_date ?? "").slice(0, 10);
            if (from && r.type === "time" && sortKey < from) return false;
            if (to && r.type === "time" && sortKey > to) return false;
            if (q.length) {
              const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .map((r) => ({
            kind: "reminder" as const,
            id: r.id,
            sortKey:
              r.type === "mileage"
                ? "9999-12-31"
                : String(r.due_date ?? "").slice(0, 10),
            reminder: r,
          }))
      : [];

    const allRows = [...reminderRows, ...serviceRows].sort((a, b) =>
      a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? 1 : -1
    );

    // Group by month/year and add separators
    const grouped: Array<
      | { type: "separator"; monthYear: string; monthYearKey: string }
      | { type: "item"; item: (typeof allRows)[0] }
    > = [];
    let currentMonthYear: string | null = null;

    for (const row of allRows) {
      // Get month/year from sortKey (YYYY-MM-DD or 9999-12-31 for mileage reminders)
      let monthYearKey: string;
      if (row.sortKey === "9999-12-31") {
        // Mileage reminders - use a special key
        monthYearKey = "future";
      } else {
        monthYearKey = row.sortKey.slice(0, 7); // YYYY-MM
      }

      if (monthYearKey !== currentMonthYear) {
        currentMonthYear = monthYearKey;
        if (monthYearKey !== "future") {
          grouped.push({
            type: "separator",
            monthYear: monthYearKey,
            monthYearKey,
          });
        }
      }
      grouped.push({ type: "item", item: row });
    }

    return grouped;
  }, [
    items,
    reminders,
    query,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
    showReminders,
  ]);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {t("dashboard.tiles.serviceTitle")}
            </Text>
          </View>
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <TextField
                noMarginTop
                value={query}
                onChangeText={setQuery}
                placeholder={t("timeline.searchPlaceholder")}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            <View
              style={{
                marginLeft: theme.spacing.sm,
                flexDirection: "row",
                gap: theme.spacing.sm,
              }}
            >
              <View
                style={[
                  styles.addButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate("ServiceEntryForm", { vehicleId })
                  }
                  style={({ pressed }) => [
                    styles.addButtonInner,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="add" size={24} color={theme.colors.fg} />
                </Pressable>
              </View>
              <View
                style={[
                  styles.addButton,
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
                    styles.addButtonInner,
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
                    styles.addButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <Pressable
                    onPress={resetFilters}
                    style={({ pressed }) => [
                      styles.addButtonInner,
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
            <View style={styles.filtersCard}>
              <View style={styles.toggleRow}>
                <Text style={styles.filtersLabel}>
                  {t("timeline.showReminders")}
                </Text>
                <Pressable
                  onPress={() => setShowReminders((v) => !v)}
                  style={[
                    styles.toggleButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: showReminders
                        ? theme.colors.accent
                        : theme.colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: showReminders ? "#FFFFFF" : theme.colors.muted,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    {showReminders ? t("common.on") : t("common.off")}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.filtersLabel}>
                {t("timeline.filterCategory")}
              </Text>
              <View style={styles.categoryRow}>
                {(
                  [
                    "all",
                    "maintenance",
                    "repair",
                    "inspection",
                    "upgrade",
                    "other",
                  ] as const
                ).map((c) => {
                  const selected = categoryFilter === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategoryFilter(c as any)}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border },
                        selected && { borderColor: theme.colors.fg },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected
                            ? theme.colors.fg
                            : theme.colors.muted,
                          fontWeight: "800",
                        }}
                      >
                        {c === "all"
                          ? t("common.all")
                          : t(`entryForm.categories.${c}` as any)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: theme.spacing.sm }} />
              <DateField
                noMarginTop
                label={t("timeline.filterFrom")}
                value={dateFrom}
                onChange={setDateFrom}
              />
              <View style={{ height: theme.spacing.sm }} />
              <DateField
                noMarginTop
                label={t("timeline.filterTo")}
                value={dateTo}
                onChange={setDateTo}
              />

              <View style={{ height: theme.spacing.sm }} />
              <View style={styles.rangeRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    noMarginTop
                    label={t("timeline.filterMinCost")}
                    value={minCost}
                    onChangeText={setMinCost}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    noMarginTop
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
      </View>
      <FlatList
        data={timelineRows}
        keyExtractor={(e, index) => {
          if (e.type === "separator") {
            return `separator-${e.monthYearKey}`;
          }
          return `${e.item.kind}:${e.item.id}`;
        }}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <Text
              style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}
            >
              {t("timeline.noServiceEntries")}
            </Text>
          )
        }
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

          const rowItem = item.item;
          if (rowItem.kind === "reminder") {
            const r = rowItem.reminder;
            const dateLabel =
              r.type === "time" && r.due_date
                ? formatDate(r.due_date)
                : t("reminderForm.mileage");
            const dueText =
              r.type === "time"
                ? t("reminders.dueTime", { date: r.due_date ?? "" })
                : t("reminders.dueMileage", {
                    mileage: r.due_mileage ?? "",
                    unit: distanceUnit,
                  });
            return (
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                onPress={() =>
                  navigation.navigate("ReminderDetail", {
                    vehicleId,
                    reminderId: r.id,
                  })
                }
              >
                <TimelineItem
                  tone="reminder"
                  dateLabel={dateLabel}
                  title={r.title ?? t("reminders.title")}
                  subtitle={dueText}
                />
              </Pressable>
            );
          }

          const e = rowItem.entry;
          const cat = (e.category ?? "other") as ServiceEntryCategory;
          return (
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              onPress={() =>
                navigation.navigate("ServiceEntryDetail", {
                  entryId: e.id,
                  vehicleId,
                })
              }
            >
              <TimelineItem
                dateLabel={formatDate(e.service_date)}
                title={e.title}
                subtitle={[
                  t(`entryForm.categories.${cat}` as any),
                  e.mileage
                    ? `${e.mileage.toLocaleString()} ${distanceUnit}`
                    : null,
                  e.cost != null ? `${e.cost} ${currency}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={({ leadingItem }) => {
          // Don't add separator before separator items
          if (leadingItem && leadingItem.type === "separator") {
            return null;
          }
          return <View style={{ height: theme.spacing.sm }} />;
        }}
      />
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    list: {
      paddingTop: insets.bottom,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
    header: {
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "800", color: theme.colors.fg, flex: 1 },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    searchRow: { flexDirection: "row", alignItems: "center" },
    addButton: {
      width: 50,
      height: 50,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    filtersRow: { flexDirection: "row", gap: 10 },
    filtersAction: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.sm,
      alignSelf: "flex-start",
    },
    filtersCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 10,
    },
    filtersLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleButton: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.sm,
    },
    categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    rangeRow: { flexDirection: "row", gap: 10 },
    loadingContainer: {
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      paddingTop: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      marginTop: theme.spacing.xs,
      lineHeight: 22,
      color: theme.colors.muted,
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
  });
