import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

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
          <Text style={styles.title}>{t("reminderDetail.title")}</Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onToggleStatus}
              hitSlop={10}
              disabled={!reminder}
            >
              <Text style={styles.statusLink}>
                {reminder?.status === "active"
                  ? t("reminderDetail.markDone")
                  : t("reminderDetail.markActive")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                navigation.navigate("ReminderForm", { vehicleId, reminderId })
              }
              hitSlop={10}
              disabled={!reminder}
            >
              <Text style={styles.editLink}>{t("common.edit")}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete()} hitSlop={10}>
              <Text style={styles.deleteLink}>{t("common.delete")}</Text>
            </Pressable>
          </View>
        </View>

        {reminder ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{reminder.title ?? ""}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("reminderDetail.labels.type")}
              </Text>
              <Text style={styles.value}>
                {reminder.type === "time"
                  ? t("reminderForm.time")
                  : t("reminderForm.mileage")}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("reminderDetail.labels.due")}</Text>
              <Text style={styles.value}>
                {reminder.type === "time" && reminder.due_date
                  ? formatDateDisplay(reminder.due_date, i18n.language)
                  : reminder.due_mileage ?? ""}
              </Text>
            </View>
            {reminder.type === "time" && reminder.days_before != null ? (
              <View style={styles.row}>
                <Text style={styles.label}>
                  {t("reminderDetail.labels.daysBefore")}
                </Text>
                <Text style={styles.value}>
                  {t("reminderDetail.daysBeforeValue", {
                    days: reminder.days_before,
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("reminderDetail.labels.status")}
              </Text>
              <Text style={styles.value}>
                {reminder.status === "active"
                  ? t("reminderDetail.status.active")
                  : t("reminderDetail.status.done")}
              </Text>
            </View>

            {reminder.notes ? (
              <>
                <View style={{ height: theme.spacing.sm }} />
                <Text style={styles.label}>
                  {t("reminderDetail.labels.notes")}
                </Text>
                <Text style={styles.bodyValue}>{String(reminder.notes)}</Text>
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
      justifyContent: "space-between",
    },
    statusLink: { color: theme.colors.muted, fontWeight: "700" },
    editLink: { color: theme.colors.accent, fontWeight: "800" },
    deleteLink: { color: theme.colors.danger, fontWeight: "800" },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm / 2,
    },
    detailsTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    value: {
      fontSize: theme.typography.small,
      fontWeight: "400",
      color: theme.colors.fg,
      textAlign: "right",
      flex: 1,
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
