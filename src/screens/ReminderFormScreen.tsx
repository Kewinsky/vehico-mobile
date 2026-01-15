import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { ReminderType } from "../types/domain";
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
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";

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
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dueMileage, setDueMileage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reminderId) return;
    void (async () => {
      try {
        const r = await getReminder(reminderId);
        setType(r.type);
        if (r.type === "time" && r.due_date) setDueDate(r.due_date);
        if (r.type === "mileage" && r.due_mileage != null)
          setDueMileage(String(r.due_mileage));
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
        title: title.trim(),
        notes: notes.trim().length ? notes.trim() : null,
        channel_email: true,
        channel_push: true,
        enabled: true,
      };
      if (reminderId) await updateReminder(reminderId, payload);
      else await createReminder(payload);
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.lg }} />
      <Text style={styles.h1}>
        {reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")}
      </Text>

      <View style={{ height: 14 }} />
      <TextField
        noMarginTop
        label={t("reminderForm.titleLabel")}
        value={title}
        onChangeText={setTitle}
      />

      <View style={{ height: 14 }} />
      <TextField
        noMarginTop
        label={t("reminderForm.notesLabel")}
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.multiline}
      />

      <View style={{ height: 14 }} />
      <Text style={styles.label}>{t("reminderForm.type")}</Text>
      <View style={styles.row}>
        {(["time", "mileage"] as const).map((kind) => (
          <Pressable
            key={kind}
            onPress={() => setType(kind)}
            style={[
              styles.choice,
              { borderColor: theme.colors.border },
              type === kind && { borderColor: theme.colors.fg },
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

      <View style={{ height: 12 }} />
      {type === "time" ? (
        <>
          <DateField
            noMarginTop
            label={t("reminderForm.dueDate")}
            value={dueDate}
            onChange={setDueDate}
            disabled={saving}
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
          />
        </>
      )}

      <View style={{ height: 16 }} />
      <Button onPress={onSave} disabled={!canSave || saving}>
        {t("common.save")}
      </Button>
      <View style={{ height: 10 }} />
      <Button
        onPress={() => navigation.goBack()}
        variant="ghost"
        disabled={saving}
      >
        {t("common.cancel")}
      </Button>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
    label: { fontSize: 13, fontWeight: "800", color: theme.colors.muted },
    multiline: {
      height: 84,
      paddingTop: 12,
      textAlignVertical: "top",
    },
    // One row, two columns for reminder type selection
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    choice: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flex: 1,
      alignItems: "center",
    },
  });
