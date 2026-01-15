import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type {
  Reminder,
  ServiceEntry,
  ServiceEntryCategory,
} from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
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

export function VehicleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
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

  const load = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      try {
        if (opts?.refreshing) setRefreshing(true);
        else setLoading(true);
        const [data, rs] = await Promise.all([
          listServiceEntries(vehicleId),
          listReminders(vehicleId),
        ]);
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
      maxCost.trim().length > 0
    );
  }, [categoryFilter, dateFrom, dateTo, minCost, maxCost]);

  function resetFilters() {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
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

    const reminderRows = reminders
      .filter((r) => {
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
      }));

    return [...reminderRows, ...serviceRows].sort((a, b) =>
      a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? 1 : -1
    );
  }, [
    items,
    reminders,
    query,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
  ]);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <FlatList
        data={timelineRows}
        keyExtractor={(e) => `${e.kind}:${e.id}`}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        ListHeaderComponent={
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
              <View style={{ marginLeft: 10 }}>
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
              </View>
            </View>
            <View style={styles.filtersRow}>
              <Pressable
                onPress={() => setFiltersOpen((v) => !v)}
                style={[
                  styles.filtersAction,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                  {t("timeline.filters")}
                  {hasActiveFilters ? " •" : ""}
                </Text>
              </Pressable>
              {hasActiveFilters ? (
                <Pressable
                  onPress={resetFilters}
                  style={[
                    styles.filtersAction,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {t("timeline.reset")}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {filtersOpen ? (
              <View style={styles.filtersCard}>
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

                <View style={{ height: 12 }} />
                <DateField
                  noMarginTop
                  label={t("timeline.filterFrom")}
                  value={dateFrom}
                  onChange={setDateFrom}
                />
                <View style={{ height: 10 }} />
                <DateField
                  noMarginTop
                  label={t("timeline.filterTo")}
                  value={dateTo}
                  onChange={setDateTo}
                />

                <View style={{ height: 12 }} />
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
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.colors.fg }]}>
                {t("timeline.emptyTitle")}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.colors.muted }]}>
                {t("timeline.emptyBody")}
              </Text>
              <View style={{ height: 16 }} />
              <Button
                onPress={() =>
                  navigation.navigate("ServiceEntryForm", { vehicleId })
                }
              >
                {t("timeline.addEntry")}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === "reminder") {
            const r = item.reminder;
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

          const e = item.entry;
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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    list: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingBottom: 12,
      gap: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
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
      paddingHorizontal: 12,
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
    categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.card,
    },
    rangeRow: { flexDirection: "row", gap: 10 },
    empty: {
      paddingTop: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      marginTop: 8,
      lineHeight: 22,
      color: theme.colors.muted,
    },
  });
