import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { RemindersFiltersParams } from "../modal/RemindersFiltersScreen";
import { getAndClearPendingModalResult } from "../../app/pendingModalResult";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/ContentHeader";
import { SearchBar } from "../../ui/components";
import { EmptyState } from "../../ui/components/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import type { Reminder } from "../../types/domain";
import {
  listReminders,
  updateReminder,
  getRecurrenceAdvancePatch,
} from "../../services/reminders/remindersRepo";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import { HeaderButton } from "@react-navigation/elements";
import { IconButton } from "../../ui/components/IconButton";
import { ListRowWithActions } from "../../ui/components/ListRowWithActions";
import { Ionicons } from "@expo/vector-icons";
import { CustomFlatList } from "../../ui/components/CustomFlatList";

type Props = NativeStackScreenProps<AppStackParamList, "Reminders">;

export function RemindersScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    "all",
  );

  const distanceUnit = settings?.distanceUnit ?? "km";
  const vehicleId = route.params.vehicleId;

  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    refresh: refreshEntitlements,
  } = useEntitlements();

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
  const refreshEntitlementsRef = useRef(refreshEntitlements);
  refreshEntitlementsRef.current = refreshEntitlements;

  useEffect(() => {
    void load({ showLoading: false });
    const unsub = navigation.addListener("focus", () => {
      const pending = getAndClearPendingModalResult<RemindersFiltersParams>(
        "reminders",
      );
      if (pending) {
        setDateFrom(pending.dateFrom ?? "");
        setDateTo(pending.dateTo ?? "");
        setStatusFilter(pending.statusFilter ?? "all");
      }
      void refreshEntitlementsRef.current?.().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
    return unsub;
  }, [navigation, load]);

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

  const filteredRemindersList = useMemo(() => {
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const filtered = items.filter((r) => {
      const q = query.trim().toLowerCase();
      if (q.length) {
        const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      if (r.due_date) {
        const reminderDate = String(r.due_date).slice(0, 10);
        if (from && reminderDate < from) return false;
        if (to && reminderDate > to) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.due_date ? String(a.due_date).slice(0, 10) : "9999-12-31";
      const dateB = b.due_date ? String(b.due_date).slice(0, 10) : "9999-12-31";
      const dateCmp = dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;
      const mileageA = a.due_mileage ?? 0;
      const mileageB = b.due_mileage ?? 0;
      return mileageB - mileageA;
    });

    return sorted;
  }, [items, query, dateFrom, dateTo, statusFilter]);

  const getMonthYearKey = (reminder: Reminder) =>
    reminder.due_date ? String(reminder.due_date).slice(0, 7) : "";

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

  const openFilters = useCallback(() => {
    navigation.navigate("RemindersFilters", {
      vehicleId: route.params.vehicleId,
      dateFrom,
      dateTo,
      statusFilter,
    });
  }, [navigation, route.params.vehicleId, dateFrom, dateTo, statusFilter]);

  const headerRight = useMemo(
    () => (
      <View style={styles.headerRight}>
        <HeaderButton
          onPress={openFilters}
          tintColor={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
        >
          <Ionicons
            name="filter-outline"
            size={22}
            color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
          />
        </HeaderButton>
        <HeaderButton
          onPress={onAddReminderPress}
          tintColor={theme.colors.fg}
        >
          <Ionicons name="add" size={24} color={theme.colors.fg} />
        </HeaderButton>
      </View>
    ),
    [
      openFilters,
      onAddReminderPress,
      hasActiveFilters,
      theme.colors.accent,
      theme.colors.fg,
      styles.headerRight,
    ],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      right={headerRight}
    >
      <CustomFlatList<Reminder>
        data={filteredRemindersList}
        listHeaderComponent={
          <>
            <ContentHeader title={t("dashboard.tiles.remindersTitle")} />
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.search", { defaultValue: "Search" })}
            />
          </>
        }
        groupByMonth
        getMonthYearKey={getMonthYearKey}
        keyExtractor={(item) => item.id}
        renderItem={({ item: reminder }) => {
          const isDone = reminder.status === "done";
          return (
            <ListRowWithActions
              title={reminder.title ?? ""}
              subtitle={[
                reminder.due_date
                  ? t("reminders.dueTime", { date: reminder.due_date })
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
              onPress={() =>
                navigation.navigate("ReminderForm", {
                  vehicleId: route.params.vehicleId,
                  reminderId: reminder.id,
                })
              }
              muted={isDone}
              dimmed={isDone}
              trailing={
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
              }
            />
          );
        }}
        ListEmptyComponent={<EmptyState body={t("reminders.noItems")} />}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
      />
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
  });
