import { useCallback, useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
} from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
import { listVehicleAttachments } from "../services/attachments/attachmentsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { TimelineItem } from "../ui/components/TimelineItem";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { hexToRgba } from "../ui/components/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceHistory">;

import {
  formatDateDisplay,
  formatMonthYear,
  formatMonthYearPL,
} from "../utils/dateFormatting";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Use local time to avoid UTC date shifting.
  return new Date(year, month - 1, day);
}

export function ServiceHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium, remindersLimit } = useEntitlements();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const contentPad = theme.layout?.contentPaddingHorizontal ?? theme.spacing.md;
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const { vehicleId } = route.params;
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [attachmentsCount, setAttachmentsCount] = useState<
    Record<string, number>
  >({});
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
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [showReminders, setShowReminders] = useState(false);
  const [sortOption, setSortOption] = useState<
    | "date-newest"
    | "date-oldest"
    | "title-az"
    | "title-za"
    | "cost-asc"
    | "cost-desc"
  >("date-newest");

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const [data, rs, attachments] = await Promise.all([
          listServiceEntries(vehicleId),
          listReminders(
            vehicleId,
            isPremium ? undefined : { limit: remindersLimit },
          ),
          listVehicleAttachments(vehicleId),
        ]);
        setItems(data);
        setReminders(rs);

        // Count attachments per service entry
        const countMap: Record<string, number> = {};
        for (const entry of data) {
          const entryAttachments = attachments.filter(
            (att) => att.service_entry_id === entry.id,
          );
          countMap[entry.id] = entryAttachments.length;
        }
        setAttachmentsCount(countMap);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [vehicleId, t, isPremium, remindersLimit],
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

  const hasActiveFilters = useMemo(() => {
    return (
      categoryFilter !== "all" ||
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      minCost.trim().length > 0 ||
      maxCost.trim().length > 0 ||
      showReminders
    );
  }, [categoryFilter, dateFrom, dateTo, minCost, maxCost, showReminders]);

  function resetFilters() {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setShowReminders(false);
    setSortOption("date-newest");
  }

  const categoryLabel = useMemo(() => {
    if (categoryFilter === "all") return t("common.all");
    return t(`entryForm.categories.${categoryFilter}` as any);
  }, [categoryFilter, t]);

  const sortField = useMemo(() => {
    const [field] = sortOption.split("-") as [string, string];
    if (field === "title") return "title" as const;
    if (field === "cost") return "cost" as const;
    return "date" as const;
  }, [sortOption]);

  function setSortField(next: typeof sortField) {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
    if (next === "cost") setSortOption("cost-asc");
  }

  function openPicker(kind: "from" | "to") {
    const current = kind === "from" ? dateFrom : dateTo;
    setDatePickerDraft(
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date())),
    );
    setOpenDatePicker(kind);
  }

  function cancelPicker() {
    setOpenDatePicker(null);
  }

  function confirmPicker() {
    if (!openDatePicker) return;
    const ymd = formatYmd(datePickerDraft);
    if (openDatePicker === "from") setDateFrom(ymd);
    if (openDatePicker === "to") setDateTo(ymd);
    setOpenDatePicker(null);
  }

  function renderInlineDatePicker() {
    return (
      <View
        style={[
          styles.pickerWrap,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <DateTimePicker
          value={datePickerDraft}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={
            Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
              ? "dark"
              : "light"
          }
          onChange={(event, selectedDate) => {
            if (Platform.OS === "ios") {
              if (selectedDate) setDatePickerDraft(selectedDate);
              return;
            }

            setOpenDatePicker(null);
            if ((event as any)?.type === "dismissed") return;
            if (!selectedDate) return;
            const ymd = formatYmd(selectedDate);
            if (openDatePicker === "from") setDateFrom(ymd);
            if (openDatePicker === "to") setDateTo(ymd);
          }}
        />
        {Platform.OS === "ios" ? (
          <View style={styles.pickerActionsRow}>
            <Pressable
              onPress={cancelPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.pickerActionText, { color: theme.colors.muted }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: accentBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerActionText,
                  { color: theme.colors.accent },
                ]}
              >
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function showCategoryPicker() {
    const options: ServiceEntryCategory[] = [
      "maintenance",
      "repair",
      "inspection",
      "upgrade",
      "oil_engine",
      "other",
    ];
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setCategoryFilter("all") },
      ...options.map((c) => ({
        text: t(`entryForm.categories.${c}` as any),
        onPress: () => setCategoryFilter(c),
      })),
    ];
    Alert.alert(t("timeline.filterCategory"), "", buttons, {
      cancelable: true,
    });
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
        sortMileage: e.mileage ?? -1, // Use -1 for entries without mileage
        entry: e,
      }));

    const reminderRows = showReminders
      ? reminders
          .filter((r) => {
            if (r.status !== "active") return false;
            const sortKey = r.due_date
              ? String(r.due_date).slice(0, 10)
              : "9999-12-31";
            if (from && r.due_date && sortKey < from) return false;
            if (to && r.due_date && sortKey > to) return false;
            if (q.length) {
              const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .map((r) => ({
            kind: "reminder" as const,
            id: r.id,
            sortKey: r.due_date
              ? String(r.due_date).slice(0, 10)
              : "9999-12-31",
            reminder: r,
          }))
      : [];

    // Sort service rows based on sortOption
    const [sortBy, sortOrder] = sortOption.split("-") as [string, string];
    const sortedServiceRows = [...serviceRows].sort((a, b) => {
      if (sortBy === "date") {
        // Sort by date
        if (a.sortKey === b.sortKey) return 0;
        if (sortOrder === "newest") {
          return a.sortKey < b.sortKey ? 1 : -1;
        } else {
          return a.sortKey > b.sortKey ? 1 : -1;
        }
      }

      if (sortBy === "title") {
        const aTitle = (a.entry.title ?? "").trim();
        const bTitle = (b.entry.title ?? "").trim();
        const cmp = aTitle.localeCompare(bTitle, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return sortOrder === "az" ? cmp : -cmp;
        // Tiebreaker: newest first
        return b.sortKey.localeCompare(a.sortKey);
      }

      // Sort by cost
      const aCost = a.entry.cost == null ? null : Number(a.entry.cost);
      const bCost = b.entry.cost == null ? null : Number(b.entry.cost);
      if (aCost == null && bCost == null) return 0;
      if (aCost == null) return 1;
      if (bCost == null) return -1;
      const diff = aCost - bCost;
      if (diff !== 0) return sortOrder === "asc" ? diff : -diff;
      return b.sortKey.localeCompare(a.sortKey);
    });

    // Reminders are always sorted by date (newest first)
    const sortedReminderRows = [...reminderRows].sort((a, b) =>
      a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? 1 : -1,
    );

    // Combine: if sorting by date, mix reminders with service entries
    // If sorting by title/cost, show service entries first, then reminders
    let allRows: Array<(typeof serviceRows)[0] | (typeof reminderRows)[0]>;

    if (sortBy === "date") {
      // Mix reminders and service entries, sort by date
      const mixed: Array<(typeof serviceRows)[0] | (typeof reminderRows)[0]> = [
        ...sortedReminderRows,
        ...sortedServiceRows,
      ];
      allRows = mixed.sort((a, b) => {
        if (a.sortKey === b.sortKey) return 0;
        if (sortOrder === "newest") {
          return a.sortKey < b.sortKey ? 1 : -1;
        } else {
          return a.sortKey > b.sortKey ? 1 : -1;
        }
      });
    } else {
      // Sort by title/cost: service entries first, then reminders
      allRows = [...sortedServiceRows, ...sortedReminderRows];
    }

    // Group by month/year and add separators (only when sorting by date)
    const grouped: Array<
      | { type: "separator"; monthYear: string; monthYearKey: string }
      | { type: "item"; item: (typeof allRows)[0] }
    > = [];

    if (sortBy === "date") {
      // Only add separators when sorting by date
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
    } else {
      // When sorting by title/cost, don't add separators - just add items
      for (const row of allRows) {
        grouped.push({ type: "item", item: row });
      }
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
    sortOption,
  ]);

  const filterPanelContent = (
    <>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBarWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.muted}
            style={styles.searchBarIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("timeline.searchPlaceholder")}
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            style={[styles.searchBarInput, { color: theme.colors.fg }]}
          />
        </View>
        <View style={styles.panelButtonsRow}>
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
                color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
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
        <>
          <View style={{ height: theme.spacing.sm }} />
          <View
            style={[
              styles.filtersCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.row}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.valueText, { color: theme.colors.fg }]}>
                {t("timeline.showReminders")}
              </Text>
              <Switch
                value={showReminders}
                onValueChange={setShowReminders}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.accent,
                }}
                thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <Pressable
              onPress={showCategoryPicker}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color:
                      categoryFilter === "all"
                        ? theme.colors.muted
                        : theme.colors.fg,
                  },
                ]}
              >
                {categoryFilter === "all"
                  ? t("timeline.filterCategory")
                  : categoryLabel}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.accent}
              />
            </Pressable>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View
                style={[
                  styles.segmentWrap,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.bg,
                  },
                ]}
              >
                {(["date", "title", "cost"] as const).map((f) => {
                  const selected = sortField === f;
                  const label =
                    f === "date"
                      ? t("timeline.sortFieldDate")
                      : f === "title"
                        ? t("timeline.sortFieldTitle")
                        : t("timeline.sortFieldAmount");
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setSortField(f)}
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
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="options-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View
                style={[
                  styles.segmentWrap,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.bg,
                  },
                ]}
              >
                {sortField === "date" ? (
                  <>
                    {(["newest", "oldest"] as const).map((o) => {
                      const selected = sortOption === `date-${o}`;
                      const label =
                        o === "newest"
                          ? t("timeline.sortOrderNewest")
                          : t("timeline.sortOrderOldest");
                      return (
                        <Pressable
                          key={o}
                          onPress={() =>
                            setSortOption(
                              o === "newest" ? "date-newest" : "date-oldest",
                            )
                          }
                          style={({ pressed }) => [
                            styles.segment,
                            selected && styles.segmentSelected,
                            {
                              borderColor: theme.colors.accent,
                              backgroundColor: selected
                                ? accentBg
                                : "transparent",
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
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                ) : sortField === "title" ? (
                  <>
                    {(["az", "za"] as const).map((o) => {
                      const selected = sortOption === `title-${o}`;
                      const label =
                        o === "az"
                          ? t("timeline.sortOrderAz")
                          : t("timeline.sortOrderZa");
                      return (
                        <Pressable
                          key={o}
                          onPress={() =>
                            setSortOption(o === "az" ? "title-az" : "title-za")
                          }
                          style={({ pressed }) => [
                            styles.segment,
                            selected && styles.segmentSelected,
                            {
                              borderColor: theme.colors.accent,
                              backgroundColor: selected
                                ? accentBg
                                : "transparent",
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
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {(["asc", "desc"] as const).map((o) => {
                      const selected = sortOption === `cost-${o}`;
                      const label =
                        o === "asc"
                          ? t("timeline.sortOrderAmountAsc")
                          : t("timeline.sortOrderAmountDesc");
                      return (
                        <Pressable
                          key={o}
                          onPress={() =>
                            setSortOption(
                              o === "asc" ? "cost-asc" : "cost-desc",
                            )
                          }
                          style={({ pressed }) => [
                            styles.segment,
                            selected && styles.segmentSelected,
                            {
                              borderColor: theme.colors.accent,
                              backgroundColor: selected
                                ? accentBg
                                : "transparent",
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
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                )}
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <Pressable
              onPress={() => openPicker("from")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color: dateFrom ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
              >
                {dateFrom || t("timeline.filterFrom")}
              </Text>
            </Pressable>
            {openDatePicker === "from" ? (
              <>
                {renderInlineDatePicker()}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}

            <Pressable
              onPress={() => openPicker("to")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color: dateTo ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
              >
                {dateTo || t("timeline.filterTo")}
              </Text>
            </Pressable>
            {openDatePicker === "to" ? (
              <>
                {renderInlineDatePicker()}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}

            <View style={styles.row}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.accent}
              />
              <TextInput
                value={minCost}
                onChangeText={setMinCost}
                keyboardType="decimal-pad"
                placeholder={`${t("timeline.filterMinCost")} (${currency})`}
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, { color: theme.colors.fg }]}
              />
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.accent}
              />
              <TextInput
                value={maxCost}
                onChangeText={setMaxCost}
                keyboardType="decimal-pad"
                placeholder={`${t("timeline.filterMaxCost")} (${currency})`}
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, { color: theme.colors.fg }]}
              />
            </View>
          </View>
        </>
      ) : null}
    </>
  );

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <ScreenLayout
        title={t("dashboard.tiles.serviceTitle")}
        scrollable={false}
        filterPanel={filterPanelContent}
      >
        <FlatList
          data={timelineRows}
          keyExtractor={(e) => {
            if (e.type === "separator") {
              return `separator-${e.monthYearKey}`;
            }
            return `${e.item.kind}:${e.item.id}`;
          }}
          style={[styles.list, { marginHorizontal: -contentPad }]}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: contentPad },
          ]}
          scrollIndicatorInsets={{ right: 0 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onTouchStart={Keyboard.dismiss}
          refreshing={refreshing}
          onRefresh={() => void load({ refreshing: true })}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <LoadingIndicator />
              </View>
            ) : (
              <Text
                style={{
                  color: theme.colors.muted,
                  marginTop: theme.spacing.xs,
                }}
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
                    style={[
                      styles.separatorText,
                      { color: theme.colors.muted },
                    ]}
                  >
                    {monthYearText}
                  </Text>
                </View>
              );
            }

            const rowItem = item.item;
            if (rowItem.kind === "reminder") {
              const r = rowItem.reminder;
              const dueText = [
                r.due_date
                  ? t("reminders.dueTime", { date: r.due_date })
                  : null,
                r.due_mileage != null
                  ? t("reminders.dueMileage", {
                      mileage: String(r.due_mileage),
                      unit: distanceUnit,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                  onPress={() =>
                    navigation.navigate("ReminderForm", {
                      vehicleId,
                      reminderId: r.id,
                    })
                  }
                >
                  <TimelineItem
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
                  navigation.navigate("ServiceEntryForm", {
                    entryId: e.id,
                    vehicleId,
                  })
                }
              >
                <TimelineItem
                  title={e.title}
                  badge={t(`entryForm.categories.${cat}` as any)}
                  badgeVariant="accent"
                  subtitle={[
                    e.service_date
                      ? formatDateDisplay(e.service_date, i18n.language)
                      : null,
                    e.mileage
                      ? `${e.mileage.toLocaleString()} ${distanceUnit}`
                      : null,
                    e.cost != null ? `${e.cost} ${currency}` : null,
                    attachmentsCount[e.id] > 0
                      ? `${attachmentsCount[e.id]} ${
                          attachmentsCount[e.id] === 1
                            ? t("attachments.attachmentLabel")
                            : t("attachments.title").toLowerCase()
                        }`
                      : null,
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
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    panelButtonsRow: {
      marginLeft: theme.spacing.sm,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
    editLink: { color: theme.colors.accent, fontWeight: "800" },
    searchRow: { flexDirection: "row", alignItems: "center" },
    searchBarWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      height: theme.spacing.lg * 2,
      paddingLeft: theme.spacing.sm,
    },
    searchBarIcon: {
      marginRight: theme.spacing.xs,
    },
    searchBarInput: {
      flex: 1,
      height: "100%",
      paddingVertical: 0,
      fontSize: theme.typography.body,
    },
    addButton: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
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
    filtersRow: { flexDirection: "row", gap: theme.spacing.sm },
    filtersAction: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.sm,
      alignSelf: "flex-start",
    },
    filtersCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    divider: { height: 1, width: "100%" },
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    segmentWrap: {
      flex: 1,
      minWidth: 0,
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
    segmentSelected: { borderWidth: 1 },
    segmentTextSmall: { fontSize: theme.typography.small, fontWeight: "700" },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    loadingContainer: {
      flex: 1,
      minHeight: 200,
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      paddingTop: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 6,
      color: theme.colors.muted,
    },
    separator: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    separatorText: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
