import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";
import { Alert, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import type { Reminder, Vehicle } from "../../types/domain";
import {
  deleteReminder,
  listReminders,
  updateReminder,
} from "../../services/reminders/remindersRepo";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import { ReminderItem } from "../../ui/components/list/ReminderItem";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";

type Props = NativeStackScreenProps<AppStackParamList, "Reminders">;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getReminderProgressPercent(
  reminder: Reminder,
  currentMileage: number | null | undefined,
  now: Date,
): number {
  let dateProgress: number | null = null;
  let dateRemainingFraction: number | null = null;
  if (reminder.due_date) {
    const due = new Date(reminder.due_date);
    const created = reminder.created_at ? new Date(reminder.created_at) : null;
    const hasValidCreated = created != null && !Number.isNaN(created.getTime());
    const createdMs = hasValidCreated ? created.getTime() : now.getTime();
    const startMs = createdMs < due.getTime() ? createdMs : now.getTime();
    const totalMs = Math.max(1, due.getTime() - startMs);
    const remainingMs = due.getTime() - now.getTime();
    const coveredMs = totalMs - Math.max(0, remainingMs);
    dateProgress = clamp(coveredMs / totalMs, 0, 1);
    dateRemainingFraction = clamp(Math.max(0, remainingMs) / totalMs, 0, 1);
  }

  let mileageProgress: number | null = null;
  let mileageRemainingFraction: number | null = null;
  if (reminder.due_mileage != null && currentMileage != null) {
    const startMileage = reminder.recurrence_anchor_mileage ?? 0;
    const totalDistance = Math.max(1, reminder.due_mileage - startMileage);
    const coveredDistance = currentMileage - startMileage;
    mileageProgress = clamp(coveredDistance / totalDistance, 0, 1);
    const mileageRemaining = Math.max(0, reminder.due_mileage - currentMileage);
    mileageRemainingFraction = clamp(mileageRemaining / totalDistance, 0, 1);
  }

  const useDateForProgress =
    dateRemainingFraction != null &&
    (mileageRemainingFraction == null ||
      dateRemainingFraction <= mileageRemainingFraction);
  const progress = useDateForProgress
    ? (dateProgress ?? mileageProgress ?? 0)
    : (mileageProgress ?? dateProgress ?? 0);

  return Math.round(clamp(progress, 0, 1) * 100);
}

export function RemindersScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { settings } = useUserSettings();

  const [items, setItems] = useState<Reminder[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "overdue" | "completed"
  >("upcoming");

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
        const [data, vehicleData] = await Promise.all([
          listReminders(vehicleId, options),
          getVehicle(vehicleId),
        ]);
        setItems(data);
        setVehicle(vehicleData);
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

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  const isReminderOverdue = useCallback(
    (reminder: Reminder) => {
      const today = new Date().toISOString().slice(0, 10);
      const dateOverdue =
        reminder.due_date != null && String(reminder.due_date).slice(0, 10) < today;
      const mileageOverdue =
        reminder.due_mileage != null &&
        vehicle?.mileage != null &&
        vehicle.mileage >= reminder.due_mileage;
      return dateOverdue || mileageOverdue;
    },
    [vehicle?.mileage],
  );

  const filteredRemindersList = useMemo(() => {
    const filtered = items.filter((r) => {
      const q = query.trim().toLowerCase();
      if (q.length) {
        const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const isDone = r.status === "done";
      const isOverdue = isReminderOverdue(r);
      if (activeTab === "completed" && !isDone) return false;
      if (activeTab === "overdue" && (isDone || !isOverdue)) return false;
      if (activeTab === "upcoming" && (isDone || isOverdue)) return false;
      return true;
    });

    const now = new Date();
    const currentMileage = vehicle?.mileage ?? null;
    const sorted = [...filtered].sort((a, b) => {
      const aDone = a.status === "done";
      const bDone = b.status === "done";
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aProgress = getReminderProgressPercent(a, currentMileage, now);
      const bProgress = getReminderProgressPercent(b, currentMileage, now);
      if (aProgress !== bProgress) return bProgress - aProgress;

      const dateA = a.due_date ? String(a.due_date).slice(0, 10) : "9999-12-31";
      const dateB = b.due_date ? String(b.due_date).slice(0, 10) : "9999-12-31";
      return dateA.localeCompare(dateB);
    });

    return sorted;
  }, [items, query, activeTab, vehicle?.mileage, isReminderOverdue]);

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

  async function handleToggleDone(reminder: Reminder) {
    try {
      const nextStatus = reminder.status === "done" ? "active" : "done";
      const saved = await updateReminder(reminder.id, { status: nextStatus });
      setItems((prev) => prev.map((item) => (item.id === reminder.id ? saved : item)));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function handleDeleteReminder(reminder: Reminder) {
    Alert.alert(t("reminders.deleteTitle"), t("reminders.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(reminder.id);
            setItems((prev) => prev.filter((item) => item.id !== reminder.id));
          } catch (e: any) {
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  const headerActions: HeaderAction[] = useMemo(
    () => [
      {
        type: "add",
        onPress: onAddReminderPress,
      },
    ],
    [onAddReminderPress],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
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
            <View style={{ marginBottom: 12 }}>
              <SegmentTabs<"upcoming" | "overdue" | "completed">
                value={activeTab}
                options={[
                  {
                    value: "upcoming",
                    label: t("reminders.tabUpcoming", { defaultValue: "Upcoming" }),
                  },
                  {
                    value: "overdue",
                    label: t("reminders.tabOverdue", { defaultValue: "Overdue" }),
                  },
                  {
                    value: "completed",
                    label: t("reminders.tabCompleted", { defaultValue: "Completed" }),
                  },
                ]}
                onChange={setActiveTab}
                variant="secondary"
              />
            </View>
          </>
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item: reminder }) => {
          const isDone = reminder.status === "done";
          return (
            <ReminderItem
              title={reminder.title ?? ""}
              createdAt={reminder.created_at}
              dueDate={reminder.due_date}
              dueMileage={reminder.due_mileage}
              currentMileage={vehicle?.mileage ?? null}
              anchorMileage={reminder.recurrence_anchor_mileage}
              distanceUnit={distanceUnit}
              remainingDistanceLabel={t("reminders.remainingDistance")}
              estimatedTimeLabel={t("reminders.estimatedTime")}
              onPress={() =>
                navigation.navigate("ReminderForm", {
                  vehicleId: route.params.vehicleId,
                  reminderId: reminder.id,
                })
              }
              onToggleDone={() => void handleToggleDone(reminder)}
              onDelete={() => handleDeleteReminder(reminder)}
              done={isDone}
              dimmed={isDone}
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
