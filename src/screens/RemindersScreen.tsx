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
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Reminder } from "../types/domain";
import {
  deleteReminder,
  listReminders,
  updateReminder,
} from "../services/reminders/remindersRepo";
import { cancelLocalReminder } from "../services/push/localReminderNotifications";
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent]
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
    null
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    "all"
  );
  const { isPremium, remindersLimit } = useEntitlements();

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const data = await listReminders(route.params.vehicleId);
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
    [route.params.vehicleId, t]
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
    return unsub;
  }, [navigation, load]);

  async function toggleStatus(reminderId: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === "active" ? "done" : "active";
      await updateReminder(reminderId, { status: newStatus });
      setItems((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      toastError(err?.message ?? t("common.error"));
    }
  }

  function confirmDelete(id: string) {
    Alert.alert(t("reminders.deleteTitle"), t("reminders.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await cancelLocalReminder(id);
            await deleteReminder(id);
            setItems((prev) => prev.filter((x) => x.id !== id));
          } catch (err: any) {
            toastError(err?.message ?? t("common.error"));
          }
        },
      },
    ]);
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
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date()))
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

      // Filter by date - only for time-based reminders
      if (r.type === "time" && r.due_date) {
        const reminderDate = String(r.due_date).slice(0, 10);
        if (from && reminderDate < from) return false;
        if (to && reminderDate > to) return false;
      }

      return true;
    });

    // Sort by date (time-based reminders) or mileage (mileage-based reminders)
    const sorted = [...filtered].sort((a, b) => {
      if (a.type === "time" && b.type === "time") {
        const dateA = a.due_date
          ? String(a.due_date).slice(0, 10)
          : "9999-12-31";
        const dateB = b.due_date
          ? String(b.due_date).slice(0, 10)
          : "9999-12-31";
        return dateB.localeCompare(dateA); // Descending
      }
      if (a.type === "mileage" && b.type === "mileage") {
        const mileageA = a.due_mileage ?? 0;
        const mileageB = b.due_mileage ?? 0;
        return mileageB - mileageA; // Descending
      }
      // Time-based reminders come before mileage-based
      return a.type === "time" ? -1 : 1;
    });

    // Group by month/year and add separators (only for time-based reminders)
    const grouped: Array<
      | { type: "separator"; monthYear: string; monthYearKey: string }
      | { type: "item"; item: Reminder }
    > = [];
    let currentMonthYear: string | null = null;

    for (const reminder of sorted) {
      if (reminder.type === "time" && reminder.due_date) {
        const monthYearKey = String(reminder.due_date).slice(0, 7); // YYYY-MM
        if (monthYearKey !== currentMonthYear) {
          currentMonthYear = monthYearKey;
          grouped.push({
            type: "separator",
            monthYear: monthYearKey,
            monthYearKey,
          });
        }
        grouped.push({ type: "item", item: reminder });
      } else {
        // Mileage-based reminders don't have separators
        grouped.push({ type: "item", item: reminder });
      }
    }

    return grouped;
  }, [items, query, dateFrom, dateTo, statusFilter]);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <FlatList
        data={filteredItemsWithSeparators}
        keyExtractor={(item, index) => {
          if (item.type === "separator") {
            return `separator-${item.monthYearKey}`;
          }
          return item.item.id;
        }}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onTouchStart={Keyboard.dismiss}
        ListHeaderComponent={
          <View style={styles.fixedHeader}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.fg }]}>
                {t("dashboard.tiles.remindersTitle")}
              </Text>
            </View>
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
                    onPress={() => {
                      if (isPremium) {
                        navigation.navigate("ReminderForm", {
                          vehicleId: route.params.vehicleId,
                        });
                        return;
                      }
                      if (items.length >= remindersLimit) {
                        Alert.alert(
                          t("limits.reminderLimitReachedTitle"),
                          t("limits.reminderLimitReachedBody", {
                            limit: remindersLimit,
                          }),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("limits.upgradeToPremium"),
                              onPress: () => navigation.navigate("Shop"),
                            },
                          ]
                        );
                        return;
                      }
                      navigation.navigate("ReminderForm", {
                        vehicleId: route.params.vehicleId,
                      });
                    }}
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
                    </View>
                  </View>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
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
                          color: dateFrom
                            ? theme.colors.fg
                            : theme.colors.muted,
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
          </View>
        }
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
                  style={[styles.separatorText, { color: theme.colors.muted }]}
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
                      { color: theme.colors.fg, fontWeight: "800" },
                      isDone && { color: theme.colors.muted },
                    ]}
                  >
                    {reminder.title ?? ""}
                  </Text>
                  <Text
                    style={[
                      {
                        color: theme.colors.muted,
                        marginTop: theme.spacing.xs / 2,
                      },
                      isDone && { opacity: 0.6 },
                    ]}
                  >
                    {reminder.type === "time"
                      ? t("reminders.dueTime", {
                          date: reminder.due_date ?? "",
                        })
                      : t("reminders.dueMileage", {
                          mileage: reminder.due_mileage ?? "",
                          unit: distanceUnit,
                        })}
                  </Text>
                  {reminder.notes ? (
                    <Text
                      style={[
                        {
                          color: theme.colors.muted,
                          marginTop: theme.spacing.xs,
                          lineHeight: 18,
                        },
                        isDone && { opacity: 0.6 },
                      ]}
                      numberOfLines={3}
                    >
                      {reminder.notes}
                    </Text>
                  ) : null}
                </Pressable>
                <IconButton
                  onPress={() => toggleStatus(reminder.id, reminder.status)}
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
            <Text
              style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}
            >
              {t("reminders.noItems")}
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
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      marginBottom: theme.spacing.md,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    body: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 6,
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
    segmentTextSmall: { fontSize: theme.typography.small, fontWeight: "700" },
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
      fontWeight: "700",
    },
    separator: {
      marginTop: theme.spacing.md + 4,
      marginBottom: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    separatorText: {
      fontSize: theme.typography.small,
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
