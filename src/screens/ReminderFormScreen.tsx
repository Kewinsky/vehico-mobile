import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { ReminderType, ReminderStatus } from "../types/domain";
import {
  createReminder,
  getReminder,
  updateReminder,
} from "../services/reminders/remindersRepo";
import { scheduleRemindersForVehicle } from "../services/reminders/reminderNotifications";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { DateField } from "../ui/components/DateField";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "ReminderForm">;

export function ReminderFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = makeStyles(theme);
  const { vehicleId, reminderId } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<ReminderType>("time");
  const [status, setStatus] = useState<ReminderStatus>("active");
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dueMileage, setDueMileage] = useState("");
  const [daysBefore, setDaysBefore] = useState("7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reminderId) return;
    void (async () => {
      try {
        const r = await getReminder(reminderId);
        setType(r.type);
        setStatus(r.status);
        if (r.type === "time" && r.due_date) setDueDate(r.due_date);
        if (r.type === "mileage" && r.due_mileage != null)
          setDueMileage(String(r.due_mileage));
        if (r.type === "time" && r.days_before != null)
          setDaysBefore(String(r.days_before));
        setTitle(r.title ?? "");
        setNotes(r.notes ?? "");
      } catch (err: any) {
        toastError(t("common.error"), err?.message ?? String(err));
      }
    })();
  }, [reminderId, t]);

  const canSave = useMemo(() => {
    const okTitle = title.trim().length > 0;
    if (type === "time") return okTitle && dueDate.trim().length === 10;
    return okTitle && Number(dueMileage) > 0;
  }, [type, dueDate, dueMileage, title]);

  async function onSave() {
    try {
      setSaving(true);
      const payload = {
        vehicle_id: vehicleId,
        type,
        due_date: type === "time" ? dueDate.trim() : null,
        due_mileage: type === "mileage" ? Number(dueMileage) : null,
        days_before: type === "time" ? Number(daysBefore) || null : null,
        title: title.trim(),
        notes: notes.trim().length ? notes.trim() : null,
        status: status,
        channel_email: true,
        channel_push: true,
        enabled: true,
      };
      const reminder = reminderId
        ? await updateReminder(reminderId, payload)
        : await createReminder(payload);
      
      // Schedule notification for the reminder
      const vehicle = await getVehicle(vehicleId);
      await scheduleRemindersForVehicle(vehicleId, vehicle.title);
      
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              onPress={() => {
                if (canSave && !saving) {
                  void onSave();
                }
              }}
              hitSlop={10}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !canSave || saving ? 0.5 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name="save-outline"
                size={24}
                color={theme.colors.accent}
              />
            </Pressable>
          }
        />
      }
    >
      <View style={{ height: theme.spacing.lg }} />
      <Text style={styles.h1}>
        {reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.sm + 2 }} />
      <TextField
        noMarginTop
        label={t("reminderForm.titleLabel")}
        value={title}
        onChangeText={setTitle}
        placeholder={t("reminderForm.placeholderTitle")}
      />

      <View style={{ height: theme.spacing.sm + 2 }} />
      <TextField
        noMarginTop
        label={t("reminderForm.notesLabel")}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder={t("reminderForm.placeholderNotes")}
      />

      <View style={{ height: theme.spacing.sm + 2 }} />
      <Text style={styles.label}>{t("reminderForm.type")}</Text>
      <View style={styles.row}>
        {(["time", "mileage"] as const).map((kind) => (
          <Pressable
            key={kind}
            onPress={() => setType(kind)}
            style={[
              styles.choice,
              { borderColor: theme.colors.border },
              type === kind && { borderColor: theme.colors.accent },
            ]}
          >
            <Text
              style={{
                color: type === kind ? theme.colors.fg : theme.colors.muted,
                fontWeight: "800",
              }}
            >
              {kind === "time"
                ? t("reminderForm.time")
                : t("reminderForm.mileage")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: theme.spacing.sm }} />
      {type === "time" ? (
        <>
          <DateField
            noMarginTop
            label={t("reminderForm.dueDate")}
            value={dueDate}
            onChange={setDueDate}
            disabled={saving}
          />
          <View style={{ height: theme.spacing.sm + 2 }} />
          <TextField
            noMarginTop
            label={t("reminderForm.daysBefore")}
            value={daysBefore}
            onChangeText={setDaysBefore}
            keyboardType="number-pad"
            placeholder="7"
          />
        </>
      ) : (
        <>
          <TextField
            noMarginTop
            label={t("reminderForm.dueMileage", { unit: distanceUnit })}
            value={dueMileage}
            onChangeText={setDueMileage}
            keyboardType="number-pad"
            placeholder={t("reminderForm.placeholderDueMileage")}
          />
        </>
      )}

      {reminderId ? (
        <>
          <View style={{ height: 14 }} />
          <Text style={styles.label}>{t("reminderForm.status")}</Text>
          <View style={styles.row}>
            {(["active", "done"] as const).map((st) => (
              <Pressable
                key={st}
                onPress={() => setStatus(st)}
                style={[
                  styles.choice,
                  { borderColor: theme.colors.border },
                  status === st && { borderColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={{
                    color: status === st ? theme.colors.fg : theme.colors.muted,
                    fontWeight: "800",
                  }}
                >
                  {st === "active"
                    ? t("reminderForm.statusActive")
                    : t("reminderForm.statusDone")}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    label: { fontSize: 13, fontWeight: "800", color: theme.colors.muted },
    // One row, two columns for reminder type selection
    row: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xs },
    choice: {
      borderWidth: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      flex: 1,
      alignItems: "center",
    },
  });
