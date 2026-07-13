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
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";
import { toastCaughtError, toastError, toastSuccess } from "../../ui/toast/toast";
import { promptAddServiceEntryFromReminder } from "../../services/reminders/reminderServiceEntryPrompt";
import { ReminderItem } from "../../ui/components/list/ReminderItem";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import { getReminderProgressPercent } from "../../services/reminders/reminderProgress";

type Props = NativeStackScreenProps<AppStackParamList, "Reminders">;

export function RemindersScreen({ route, navigation }: Props) {
  const { t } = useTranslation();

  const [items, setItems] = useState<Reminder[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "overdue" | "completed"
  >("upcoming");

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
        toastCaughtError(e, t("common.error"));
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

  const onAddReminderPress = useCallback(() => {
    if (!isPremium && items.length >= remindersLimit) {
      Alert.alert(
        t("limits.reminderLimitReachedTitle"),
        t("limits.reminderLimitReachedBody", { limit: remindersLimit }),
        getPremiumUpgradeAlertButtons(t, navigation),
      );
      return;
    }
    navigation.navigate("ReminderForm", {
      vehicleId: route.params.vehicleId,
    });
  }, [
    isPremium,
    items.length,
    remindersLimit,
    navigation,
    route.params.vehicleId,
    t,
  ]);

  async function handleToggleDone(reminder: Reminder) {
    try {
      const nextStatus = reminder.status === "done" ? "active" : "done";
      const markingDone = nextStatus === "done";
      const saved = await updateReminder(reminder.id, { status: nextStatus });
      setItems((prev) => prev.map((item) => (item.id === reminder.id ? saved : item)));
      if (markingDone) {
        promptAddServiceEntryFromReminder(reminder, t, {
          onCreated: () =>
            toastSuccess(t("reminders.serviceEntryFromReminderCreated")),
          onError: (e) => toastCaughtError(e, t("common.error")),
        });
      }
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
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
            toastCaughtError(e, t("common.error"));
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
