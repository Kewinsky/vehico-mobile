import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { i18n } from "../i18n/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Reminder } from "../types/domain";
import {
  listReminders,
  updateReminder,
  getRecurrenceAdvancePatch,
} from "../services/reminders/remindersRepo";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { hexToRgba } from "../ui/components/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "Reminders">;

import { formatMonthYear, formatMonthYearPL } from "../utils/dateFormatting";

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

export function RemindersScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const contentPad = theme.layout?.contentPaddingHorizontal ?? theme.spacing.md;
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    "all",
  );
  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const vehicleId = route.params.vehicleId;

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const options = isPremium
          ? undefined
          : freePlanVehicleId === vehicleId
            ? { freePlanReminderIds }
            : { limit: remindersLimit };
        const data = await listReminders(vehicleId, options);
        setItems(data);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [
      vehicleId,
      t,
      isPremium,
      remindersLimit,
      freePlanVehicleId,
      freePlanReminderIds,
    ],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => {
      // Refresh entitlements first (trigger updated free_plan_reminder_ids), then reload list after React has updated context
      void refreshEntitlements().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
    return unsub;
  }, [navigation, load, refreshEntitlements]);

  async function performToggle(reminder: Reminder) {
    try {
      if (reminder.status === "done") {
        await updateReminder(reminder.id, { status: "active" });
        setItems((prev) =>
          prev.map((r) =>
            r.id === reminder.id ? { ...r, status: "active" as const } : r,
          ),
        );
        return;
      }
      const advancePatch = getRecurrenceAdvancePatch(reminder);
      if (advancePatch) {
        const updated = await updateReminder(reminder.id, advancePatch);
        setItems((prev) =>
          prev.map((r) => (r.id === reminder.id ? updated : r)),
        );
      } else {
        await updateReminder(reminder.id, { status: "done" });
        setItems((prev) =>
          prev.map((r) =>
            r.id === reminder.id ? { ...r, status: "done" as const } : r,
          ),
        );
      }
    } catch (err: unknown) {
      toastError((err as Error)?.message ?? t("common.error"));
    }
  }

  function toggleStatus(reminder: Reminder) {
    if (reminder.status === "done") {
      void performToggle(reminder);
      return;
    }
    const advancePatch = getRecurrenceAdvancePatch(reminder);
    if (advancePatch) {
      Alert.alert(
        t("reminderDetail.markDoneRecurringTitle"),
        t("reminderDetail.markDoneRecurringBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("reminderDetail.markDone"),
            onPress: () => void performToggle(reminder),
          },
        ],
      );
    } else {
      void performToggle(reminder);
    }
  }

  const hasActiveFilters = useMemo(() => {
    return (
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      statusFilter !== "all"
    );
  }, [dateFrom, dateTo, statusFilter]);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
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

  const filteredItemsWithSeparators = useMemo(() => {
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const filtered = items.filter((r) => {
      const q = query.trim().toLowerCase();
      if (q.length) {
        const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Filter by status
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Filter by date when reminder has due_date
      if (r.due_date) {
        const reminderDate = String(r.due_date).slice(0, 10);
        if (from && reminderDate < from) return false;
        if (to && reminderDate > to) return false;
      }

      return true;
    });

    // Sort: by due_date if present, else by due_mileage; both descending
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.due_date ? String(a.due_date).slice(0, 10) : "9999-12-31";
      const dateB = b.due_date ? String(b.due_date).slice(0, 10) : "9999-12-31";
      const dateCmp = dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;
      const mileageA = a.due_mileage ?? 0;
      const mileageB = b.due_mileage ?? 0;
      return mileageB - mileageA;
    });

    // Group by month/year and add separators for reminders with due_date
    const grouped: Array<
      | { type: "separator"; monthYear: string; monthYearKey: string }
      | { type: "item"; item: Reminder }
    > = [];
    let currentMonthYear: string | null = null;

    for (const reminder of sorted) {
      if (reminder.due_date) {
        const monthYearKey = String(reminder.due_date).slice(0, 7);
        if (monthYearKey !== currentMonthYear) {
          currentMonthYear = monthYearKey;
          grouped.push({
            type: "separator",
            monthYear: monthYearKey,
            monthYearKey,
          });
        }
      }
      grouped.push({ type: "item", item: reminder });
    }

    return grouped;
  }, [items, query, dateFrom, dateTo, statusFilter]);

  function onAddReminderPress() {
    if (!isPremium && items.length >= remindersLimit) {
      Alert.alert(
        t("limits.reminderLimitReachedTitle"),
        t("limits.reminderLimitReachedBody", { limit: remindersLimit }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("ReminderForm", {
      vehicleId: route.params.vehicleId,
    });
  }

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
            placeholder={t("reminders.searchPlaceholder")}
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
              onPress={onAddReminderPress}
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
                name="checkmark-circle-outline"
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
                {(["all", "active", "done"] as const).map((status) => {
                  const selected = statusFilter === status;
                  const label =
                    status === "all"
                      ? t("reminders.filterAll")
                      : status === "active"
                        ? t("reminderDetail.status.active")
                        : t("reminderDetail.status.done");
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setStatusFilter(status)}
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
            ) : null}
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
        title={t("dashboard.tiles.remindersTitle")}
        scrollable={false}
        filterPanel={filterPanelContent}
      >
        <FlatList
          data={filteredItemsWithSeparators}
          keyExtractor={(item) => {
            if (item.type === "separator") {
              return `separator-${item.monthYearKey}`;
            }
            return item.item.id;
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

            const reminder = item.item;
            const isDone = reminder.status === "done";
            return (
              <View
                style={[
                  styles.card,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  isDone && styles.cardDone,
                ]}
              >
                <View style={styles.cardRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate("ReminderForm", {
                        vehicleId: route.params.vehicleId,
                        reminderId: reminder.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        {
                          color: theme.colors.fg,
                          fontWeight: theme.typography.fontWeight.bold,
                        },
                        isDone && { color: theme.colors.muted },
                      ]}
                    >
                      {reminder.title ?? ""}
                    </Text>
                    <Text
                      style={[
                        {
                          color: theme.colors.muted,
                          marginTop: theme.spacing.xs,
                        },
                        isDone && { opacity: 0.6 },
                      ]}
                    >
                      {[
                        reminder.due_date
                          ? t("reminders.dueTime", {
                              date: reminder.due_date,
                            })
                          : null,
                        reminder.due_mileage != null
                          ? t("reminders.dueMileage", {
                              mileage: String(reminder.due_mileage),
                              unit: distanceUnit,
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </Pressable>
                  <IconButton
                    onPress={() => toggleStatus(reminder)}
                    variant="ghost"
                  >
                    <Ionicons
                      name={
                        reminder.status === "active"
                          ? "checkmark-circle"
                          : "checkmark-circle-outline"
                      }
                      size={30}
                      color={
                        reminder.status === "active"
                          ? theme.colors.accent
                          : theme.colors.muted
                      }
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
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                {t("reminders.noItems")}
              </Text>
            )
          }
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
    list: { flex: 1, paddingTop: theme.spacing.md },
    listContent: {
      paddingBottom: insets.bottom,
    },
    emptyText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.small,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardDone: { opacity: 0.6 },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },

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
    filtersRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
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
    segmentTextSmall: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
    },
    separator: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    separatorText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    loadingContainer: {
      flex: 1,
      minHeight: 200,
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
  });
