import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  isValidDate,
  isPositiveNumber,
  isNonNegativeNumber,
} from "../utils/validation";
import type { ReminderType, ReminderStatus } from "../types/domain";
import {
  createReminder,
  getReminder,
  updateReminder,
} from "../services/reminders/remindersRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { DateField } from "../ui/components/DateField";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { ChoiceChip } from "../ui/components/ChoiceChip";
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
    new Date().toISOString().slice(0, 10),
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
        toastError(err?.message ?? t("common.error"));
      }
    })();
  }, [reminderId, t]);

  const canSave = useMemo(() => {
    const okTitle = title.trim().length > 0;
    if (type === "time") return okTitle && isValidDate(dueDate);
    return okTitle && isPositiveNumber(dueMileage);
  }, [type, dueDate, dueMileage, title]);

  async function onSave() {
    try {
      setSaving(true);
      if (type === "time" && !isValidDate(dueDate)) {
        toastError(t("validation.invalidDate"));
        return;
      }
      if (type === "mileage" && !isPositiveNumber(dueMileage)) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (daysBefore.trim() && !isNonNegativeNumber(daysBefore)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
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
      if (reminderId) await updateReminder(reminderId, payload);
      else await createReminder(payload);
      navigation.goBack();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
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
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>
        {reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.sm + 2 }} />
      <TextField
        noMarginTop
        label={`${t("reminderForm.titleLabel")} *`}
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
          <ChoiceChip
            key={kind}
            label={
              kind === "time"
                ? t("reminderForm.time")
                : t("reminderForm.mileage")
            }
            selected={type === kind}
            onPress={() => setType(kind)}
            style={styles.choice}
          />
        ))}
      </View>

      <View style={{ height: theme.spacing.sm }} />
      {type === "time" ? (
        <>
          <DateField
            noMarginTop
            label={`${t("reminderForm.dueDate")} *`}
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
            label={`${t("reminderForm.dueMileage", { unit: distanceUnit })} *`}
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
              <ChoiceChip
                key={st}
                label={
                  st === "active"
                    ? t("reminderForm.statusActive")
                    : t("reminderForm.statusDone")
                }
                selected={status === st}
                onPress={() => setStatus(st)}
                style={styles.choice}
              />
            ))}
          </View>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    // One row, two columns for reminder type selection
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    choice: {
      flex: 1,
    },
  });
