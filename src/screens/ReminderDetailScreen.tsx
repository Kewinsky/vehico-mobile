import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { deleteReminder, getReminder } from "../services/reminders/remindersRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ReminderDetail">;

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

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
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [reminderId, t]);

  useEffect(() => {
    void load();
  }, [load]);


  function onDelete() {
    Alert.alert(t("reminderDetail.deleteTitle"), t("reminderDetail.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(reminderId);
            navigation.goBack();
          } catch (e: any) {
            toastError(t("common.error"), e?.message ?? String(e));
          }
        },
      },
    ]);
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
          <Pressable
            onPress={() =>
              navigation.navigate("ReminderForm", { vehicleId, reminderId })
            }
            hitSlop={10}
            disabled={!reminder}
          >
            <Text style={styles.editLink}>{t("common.edit")}</Text>
          </Pressable>
        </View>

        {reminder ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{reminder.title ?? ""}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.row}>
              <Text style={styles.label}>{t("reminderDetail.labels.type")}</Text>
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
                  ? formatDate(reminder.due_date)
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
              <Text style={styles.label}>{t("reminderDetail.labels.status")}</Text>
              <Text style={styles.value}>
                {reminder.status === "active"
                  ? t("reminderDetail.status.active")
                  : t("reminderDetail.status.done")}
              </Text>
            </View>

            {reminder.notes ? (
              <>
                <View style={{ height: 10 }} />
                <Text style={styles.label}>{t("reminderDetail.labels.notes")}</Text>
                <Text style={styles.bodyValue}>{String(reminder.notes)}</Text>
              </>
            ) : null}
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button onPress={onDelete} variant="destructive" disabled={!reminder}>
          {t("common.delete")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    top: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    detailsCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    detailsTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
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
    bodyValue: { marginTop: 6, color: theme.colors.fg, lineHeight: 20 },
    muted: { marginTop: 8, color: theme.colors.muted, lineHeight: 20 },
    actions: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    loadingContainer: {
      paddingTop: 60,
      paddingBottom: 60,
      alignItems: "center",
      justifyContent: "center",
    },
  });

