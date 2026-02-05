import { useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  deleteReminder,
  getReminder,
  updateReminder,
} from "../services/reminders/remindersRepo";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../services/push/localReminderNotifications";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "ReminderForm">;

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dueMileage, setDueMileage] = useState("");
  const [daysBefore, setDaysBefore] = useState("7");
  const [saving, setSaving] = useState(false);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent]
  );

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

  function stripExamplePrefix(s: string) {
    return s
      .replace(/^e\.g\.\s*/i, "")
      .replace(/^np\.\s*/i, "")
      .trim();
  }

  function makePlaceholder(label: string, example: string) {
    const ex = stripExamplePrefix(example);
    return ex ? `${label}: ${ex}` : `${label}:`;
  }

  function confirmDelete() {
    if (!reminderId) return;
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
      let saved: Awaited<ReturnType<typeof createReminder>>;
      if (reminderId) {
        saved = await updateReminder(reminderId, payload);
      } else {
        saved = await createReminder(payload);
      }
      if (saved.status === "done") {
        await cancelLocalReminder(saved.id);
      } else {
        await scheduleLocalReminder(saved);
      }
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
        <View
          style={[
            styles.topBar,
            {
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.bg,
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.pillButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: theme.colors.fg }]}>
              {t("common.cancel")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (canSave && !saving) void onSave();
            }}
            hitSlop={10}
            disabled={!canSave || saving}
            style={({ pressed }) => [
              styles.pillButton,
              {
                borderColor: theme.colors.accent,
                backgroundColor: accentBg,
                opacity: !canSave || saving ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: theme.colors.accent }]}>
              {t("common.done")}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>
        {reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.lg }} />

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <View style={styles.row}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={makePlaceholder(
              `${t("reminderForm.titleLabel")}`,
              t("reminderForm.placeholderTitle")
            )}
            placeholderTextColor={theme.colors.muted}
            editable={!saving}
            style={[styles.input, { color: theme.colors.fg }]}
            autoCorrect={false}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />

        <View style={styles.row}>
          <Ionicons
            name="options-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            <Pressable
              onPress={() => setType("time")}
              style={[
                styles.segment,
                type === "time" && [
                  styles.segmentSelected,
                  {
                    backgroundColor: accentBg,
                    borderColor: theme.colors.accent,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      type === "time"
                        ? theme.colors.accent
                        : theme.colors.muted,
                  },
                ]}
              >
                {t("reminderForm.time")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType("mileage")}
              style={[
                styles.segment,
                type === "mileage" && [
                  styles.segmentSelected,
                  {
                    backgroundColor: accentBg,
                    borderColor: theme.colors.accent,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      type === "mileage"
                        ? theme.colors.accent
                        : theme.colors.muted,
                  },
                ]}
              >
                {t("reminderForm.mileage")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />

        {type === "time" ? (
          <>
            <Pressable
              onPress={() => setDatePickerOpen(true)}
              disabled={saving}
              style={({ pressed }) => [
                styles.row,
                pressed && !saving ? { opacity: 0.85 } : null,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.valueText, { color: theme.colors.fg }]}>
                {makePlaceholder(t("reminderForm.dueDate"), dueDate)}
              </Text>
            </Pressable>

            {datePickerOpen ? (
              <View
                style={[
                  styles.pickerWrap,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <DateTimePicker
                  value={parseYmd(dueDate)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selected) => {
                    if (Platform.OS !== "ios") {
                      setDatePickerOpen(false);
                      if ((event as any)?.type === "dismissed") return;
                      if (selected) setDueDate(formatYmd(selected));
                      return;
                    }
                    if (selected) setDueDate(formatYmd(selected));
                  }}
                />
                {Platform.OS === "ios" ? (
                  <View style={styles.pickerDoneRow}>
                    <Button
                      onPress={() => setDatePickerOpen(false)}
                      variant="ghost"
                    >
                      {t("common.done")}
                    </Button>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />

            <View style={styles.row}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.colors.accent}
              />
              <TextInput
                value={daysBefore}
                onChangeText={setDaysBefore}
                placeholder={makePlaceholder(t("reminderForm.daysBefore"), "7")}
                placeholderTextColor={theme.colors.muted}
                keyboardType="number-pad"
                editable={!saving}
                style={[styles.input, { color: theme.colors.fg }]}
              />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <Ionicons
              name="speedometer-outline"
              size={20}
              color={theme.colors.accent}
            />
            <TextInput
              value={dueMileage}
              onChangeText={setDueMileage}
              placeholder={makePlaceholder(
                t("reminderForm.dueMileage", { unit: distanceUnit }),
                t("reminderForm.placeholderDueMileage")
              )}
              placeholderTextColor={theme.colors.muted}
              keyboardType="number-pad"
              editable={!saving}
              style={[styles.input, { color: theme.colors.fg }]}
            />
          </View>
        )}
      </View>

      <View style={{ height: theme.spacing.md }} />

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <View style={[styles.row, styles.rowMultiline]}>
          <Ionicons
            name="create-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={makePlaceholder(
              t("reminderForm.notesLabel"),
              t("reminderForm.placeholderNotes")
            )}
            placeholderTextColor={theme.colors.muted}
            editable={!saving}
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.inputMultiline,
              { color: theme.colors.fg },
            ]}
          />
        </View>
      </View>

      {reminderId ? (
        <>
          <View style={{ height: theme.spacing.md }} />
          <View
            style={[
              styles.card,
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
              <View style={styles.segmentWrap}>
                <Pressable
                  onPress={() => setStatus("active")}
                  style={[
                    styles.segment,
                    status === "active" && [
                      styles.segmentSelected,
                      {
                        backgroundColor: accentBg,
                        borderColor: theme.colors.accent,
                      },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          status === "active"
                            ? theme.colors.accent
                            : theme.colors.muted,
                      },
                    ]}
                  >
                    {t("reminderForm.statusActive")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatus("done")}
                  style={[
                    styles.segment,
                    status === "done" && [
                      styles.segmentSelected,
                      {
                        backgroundColor: accentBg,
                        borderColor: theme.colors.accent,
                      },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          status === "done"
                            ? theme.colors.accent
                            : theme.colors.muted,
                      },
                    ]}
                  >
                    {t("reminderForm.statusDone")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ height: theme.spacing.lg }} />
          <Button variant="destructive" onPress={confirmDelete}>
            {t("common.delete")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    topBar: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
    },
    pillButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pillText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    rowMultiline: {
      alignItems: "flex-start",
    },
    divider: {
      height: 1,
      width: "100%",
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    inputMultiline: {
      minHeight: 96,
      paddingTop: 2,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    segmentWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
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
    segmentSelected: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    segmentText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerDoneRow: {
      paddingTop: 0,
      alignItems: "flex-end",
    },
  });
