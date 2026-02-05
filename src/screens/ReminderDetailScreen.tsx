import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  deleteReminder,
  getReminder,
  updateReminder,
} from "../services/reminders/remindersRepo";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../services/push/localReminderNotifications";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "ReminderDetail">;

import { formatDateDisplay } from "../utils/dateFormatting";
import { i18n } from "../i18n/i18n";

export function ReminderDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = makeStyles(theme);
  const distanceUnit = settings?.distanceUnit ?? "km";

  const { reminderId, vehicleId } = route.params;
  const [reminder, setReminder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await getReminder(reminderId);
      setReminder(r);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [reminderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggleStatus() {
    if (!reminder) return;
    try {
      const newStatus = reminder.status === "active" ? "done" : "active";
      await updateReminder(reminderId, { status: newStatus });
      setReminder((prev: typeof reminder) =>
        prev ? { ...prev, status: newStatus } : null
      );
      if (newStatus === "done") {
        await cancelLocalReminder(reminderId);
      } else {
        await scheduleLocalReminder({
          ...reminder,
          status: newStatus,
        });
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function onDelete() {
    Alert.alert(
      t("reminderDetail.deleteTitle"),
      t("reminderDetail.deleteBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await cancelLocalReminder(reminderId);
              await deleteReminder(reminderId);
              navigation.goBack();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ]
    );
  }

  function showActionsMenu() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];
    if (reminder) {
      buttons.push({
        text:
          reminder.status === "active"
            ? t("reminderDetail.markDone")
            : t("reminderDetail.markActive"),
        onPress: () => void onToggleStatus(),
      });
    }
    buttons.push({
      text: t("common.edit"),
      onPress: () =>
        navigation.navigate("ReminderForm", { vehicleId, reminderId }),
    });
    buttons.push({
      text: t("common.delete"),
      style: "destructive",
      onPress: onDelete,
    });
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert("", "", buttons);
  }

  const dueLabel = reminder
    ? reminder.type === "time"
      ? t("reminders.dueTime", { date: reminder.due_date ?? "" })
      : t("reminders.dueMileage", {
          mileage: reminder.due_mileage ?? "",
          unit: distanceUnit,
        })
    : "";

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {reminder?.title ?? t("reminderDetail.title")}
          </Text>
          <Pressable
            onPress={showActionsMenu}
            hitSlop={10}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.colors.fg}
            />
          </Pressable>
        </View>

        {reminder ? (
          <View
            style={[
              styles.detailsCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("reminderForm.titleLabel")}
                </Text>
              </View>
              <Text
                style={[styles.value, { color: theme.colors.fg }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {reminder.title ?? ""}
              </Text>
            </View>
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("reminderDetail.labels.type")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {reminder.type === "time"
                  ? t("reminderForm.time")
                  : t("reminderForm.mileage")}
              </Text>
            </View>
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("reminderDetail.labels.due")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {reminder.type === "time" && reminder.due_date
                  ? formatDateDisplay(reminder.due_date, i18n.language)
                  : reminder.due_mileage ?? ""}
              </Text>
            </View>
            {reminder.type === "time" && reminder.days_before != null ? (
              <View style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="today-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={[styles.label, { color: theme.colors.muted }]}>
                    {t("reminderDetail.labels.daysBefore")}
                  </Text>
                </View>
                <Text style={[styles.value, { color: theme.colors.fg }]}>
                  {t("reminderDetail.daysBeforeValue", {
                    days: reminder.days_before,
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("reminderDetail.labels.status")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {reminder.status === "active"
                  ? t("reminderDetail.status.active")
                  : t("reminderDetail.status.done")}
              </Text>
            </View>

            {reminder.notes ? (
              <>
                <View style={{ height: theme.spacing.sm }} />
                <View style={styles.labelRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={[styles.label, { color: theme.colors.muted }]}>
                    {t("reminderDetail.labels.notes")}
                  </Text>
                </View>
                <Text style={[styles.bodyValue, { color: theme.colors.fg }]}>
                  {String(reminder.notes)}
                </Text>
              </>
            ) : null}
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    top: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    menuButton: {
      padding: theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 0,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: "400",
      textAlign: "right",
    },
    bodyValue: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.fg,
      lineHeight: theme.typography.body + 4,
    },
    muted: {
      marginTop: theme.spacing.xs,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    loadingContainer: {
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
  });
