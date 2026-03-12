import { useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  isValidDate,
  isPositiveNumber,
  isNonNegativeNumber,
} from "../../utils/validation";
import type {
  ReminderStatus,
  ReminderRecurrenceUnit,
} from "../../types/domain";
import {
  createReminder,
  deleteReminder,
  getReminder,
  updateReminder,
  listReminders,
} from "../../services/reminders/remindersRepo";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../../services/push/localReminderNotifications";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import { maybeHandleBackendEntitlementLimitError } from "../../ui/limits/entitlementAlerts";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { Textarea } from "../../ui/components/common/Textarea";
import {
  REMINDER_PRESETS,
  getPresetDueDate,
  type ReminderPreset,
} from "../reminderPresets";

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
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const RECURRENCE_UNITS: { value: ReminderRecurrenceUnit; max: number }[] = [
  { value: "days", max: 31 },
  { value: "weeks", max: 4 },
  { value: "months", max: 12 },
  { value: "years", max: 10 },
];

export function ReminderFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium, remindersLimit, freePlanVehicleId, freePlanReminderIds } =
    useEntitlements();
  const styles = makeStyles(theme);
  const { vehicleId, reminderId } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dateEnabled, setDateEnabled] = useState(false);
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(
    () => new Date(),
  );
  const [daysBefore, setDaysBefore] = useState("7");
  const [dateRepeats, setDateRepeats] = useState(false);
  const [recurrenceValue, setRecurrenceValue] = useState("6");
  const [recurrenceUnit, setRecurrenceUnit] =
    useState<ReminderRecurrenceUnit>("months");

  const [mileageEnabled, setMileageEnabled] = useState(false);
  const [dueMileage, setDueMileage] = useState("");
  const [mileageRepeats, setMileageRepeats] = useState(false);
  const [recurrenceKm, setRecurrenceKm] = useState("");

  const [saving, setSaving] = useState(false);

  function getPresetRecurrenceParts(preset: ReminderPreset): string[] {
    const parts: string[] = [];
    if (
      preset.dateRepeats &&
      preset.recurrenceValue != null &&
      preset.recurrenceUnit
    ) {
      const unitKey =
        preset.recurrenceUnit === "days"
          ? "presetsEveryDays"
          : preset.recurrenceUnit === "weeks"
            ? "presetsEveryWeeks"
            : preset.recurrenceUnit === "months"
              ? "presetsEveryMonths"
              : "presetsEveryYears";
      parts.push(
        t(`reminderForm.${unitKey}`, { value: preset.recurrenceValue }),
      );
    }
    if (preset.mileageRepeats && preset.recurrenceKm != null) {
      parts.push(
        t("reminderForm.presetsEveryKm", {
          value: preset.recurrenceKm.toLocaleString(),
        }),
      );
    }
    return parts;
  }

  function applyPreset(preset: ReminderPreset) {
    setTitle(t(`reminderForm.${preset.titleKey}`));
    setNotes(preset.notesKey ? t(`reminderForm.${preset.notesKey}`) : "");
    setDateEnabled(preset.dateEnabled);
    setDueDate(getPresetDueDate(preset));
    setDaysBefore(String(preset.daysBefore));
    setDateRepeats(preset.dateRepeats);
    setRecurrenceValue(
      preset.recurrenceValue != null ? String(preset.recurrenceValue) : "6",
    );
    setRecurrenceUnit(preset.recurrenceUnit ?? "months");
    setMileageEnabled(preset.mileageEnabled);
    setDueMileage(
      preset.dueMileage != null
        ? String(preset.dueMileage)
        : preset.recurrenceKm != null
          ? String(preset.recurrenceKm)
          : "",
    );
    setMileageRepeats(preset.mileageRepeats);
    setRecurrenceKm(
      preset.recurrenceKm != null ? String(preset.recurrenceKm) : "",
    );
  }

  function clearForm() {
    setTitle("");
    setNotes("");
    setDateEnabled(false);
    setDueDate(new Date().toISOString().slice(0, 10));
    setDatePickerOpen(false);
    setDatePickerDraft(new Date());
    setDaysBefore("7");
    setDateRepeats(false);
    setRecurrenceValue("6");
    setRecurrenceUnit("months");
    setMileageEnabled(false);
    setDueMileage("");
    setMileageRepeats(false);
    setRecurrenceKm("");
  }

  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  useEffect(() => {
    if (!reminderId) return;
    void (async () => {
      try {
        const r = await getReminder(reminderId);
        setTitle(r.title ?? "");
        setNotes(r.notes ?? "");
        if (r.due_date != null) {
          setDateEnabled(true);
          setDueDate(r.due_date);
          if (r.days_before != null) setDaysBefore(String(r.days_before));
          if (
            r.recurrence_interval_value != null &&
            r.recurrence_interval_unit != null
          ) {
            setDateRepeats(true);
            setRecurrenceValue(String(r.recurrence_interval_value));
            setRecurrenceUnit(r.recurrence_interval_unit);
          }
        }
        if (r.due_mileage != null) {
          setMileageEnabled(true);
          setDueMileage(String(r.due_mileage));
          if (r.recurrence_interval_km != null) {
            setMileageRepeats(true);
            setRecurrenceKm(String(r.recurrence_interval_km));
          }
        }
      } catch (err: unknown) {
        toastError((err as Error)?.message ?? t("common.error"));
      }
    })();
  }, [reminderId, t]);

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (dateEnabled && !isValidDate(dueDate)) return false;
    if (mileageEnabled && !isPositiveNumber(dueMileage)) return false;
    if (!dateEnabled && !mileageEnabled) return false;
    if (dateRepeats) {
      const max =
        RECURRENCE_UNITS.find((u) => u.value === recurrenceUnit)?.max ?? 12;
      const v = parseInt(recurrenceValue, 10);
      if (!Number.isInteger(v) || v < 1 || v > max) return false;
    }
    if (mileageRepeats && !isPositiveNumber(recurrenceKm)) return false;
    if (daysBefore.trim() && !isNonNegativeNumber(daysBefore)) return false;
    return true;
  }, [
    title,
    dateEnabled,
    dueDate,
    mileageEnabled,
    dueMileage,
    dateRepeats,
    recurrenceValue,
    recurrenceUnit,
    mileageRepeats,
    recurrenceKm,
    daysBefore,
  ]);

  function openDatePicker() {
    setDatePickerDraft(parseYmd(dueDate));
    setDatePickerOpen(true);
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
            } catch (e: unknown) {
              toastError((e as Error)?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }

  async function onSave() {
    try {
      setSaving(true);
      if (!dateEnabled && !mileageEnabled) {
        toastError(t("validation.invalidDate"));
        return;
      }
      if (dateEnabled && !isValidDate(dueDate)) {
        toastError(t("validation.invalidDate"));
        return;
      }
      if (mileageEnabled && !isPositiveNumber(dueMileage)) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (daysBefore.trim() && !isNonNegativeNumber(daysBefore)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
      if (!reminderId && !isPremium) {
        const options =
          freePlanVehicleId === vehicleId
            ? { freePlanReminderIds }
            : { limit: remindersLimit };
        const existingReminders = await listReminders(vehicleId, options);
        if (existingReminders.length >= remindersLimit) {
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
      }

      const payload = {
        vehicle_id: vehicleId,
        due_date: dateEnabled ? dueDate.trim() : null,
        due_mileage: mileageEnabled ? Number(dueMileage) : null,
        days_before:
          dateEnabled && daysBefore.trim() ? Number(daysBefore) || null : null,
        title: title.trim(),
        notes: notes.trim().length ? notes.trim() : null,
        status: "active" as ReminderStatus,
        channel_email: true,
        channel_push: true,
        enabled: true,
        recurrence_interval_value: dateRepeats
          ? parseInt(recurrenceValue, 10) || null
          : null,
        recurrence_interval_unit: dateRepeats ? recurrenceUnit : null,
        recurrence_interval_km: mileageRepeats
          ? parseInt(recurrenceKm, 10) || null
          : null,
        recurrence_anchor_mileage:
          mileageEnabled &&
          mileageRepeats &&
          dueMileage.trim() &&
          recurrenceKm.trim()
            ? Number(dueMileage) - Number(recurrenceKm)
            : null,
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
    } catch (e: unknown) {
      if (maybeHandleBackendEntitlementLimitError(e, t, navigation)) return;
      toastError((e as Error)?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  const recurrenceUnitLabel = useMemo(() => {
    switch (recurrenceUnit) {
      case "days":
        return t("reminderForm.intervalDays");
      case "weeks":
        return t("reminderForm.intervalWeeks");
      case "months":
        return t("reminderForm.intervalMonths");
      case "years":
        return t("reminderForm.intervalYears");
      default:
        return "";
    }
  }, [recurrenceUnit, t]);

  return (
    <ModalLayout
      title={
        reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")
      }
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: !canSave || saving,
      }}
      footer={
        reminderId ? (
          <Button variant="destructive" onPress={confirmDelete}>
            {t("common.delete")}
          </Button>
        ) : (
          <Button variant="outlined" onPress={clearForm} disabled={saving}>
            {t("common.clearButton")}
          </Button>
        )
      }
    >
      <FormScreen noLayout>
        {!reminderId ? (
          <>
            <Text
              style={[
                styles.presetsSectionLabel,
                { color: theme.colors.muted },
              ]}
            >
              {t("reminderForm.presetsTitle")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScrollContent}
              style={styles.presetsScroll}
            >
              {REMINDER_PRESETS.map((preset) => {
                const summaryParts = getPresetRecurrenceParts(preset);
                return (
                  <Pressable
                    key={preset.titleKey}
                    onPress={() => applyPreset(preset)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.card,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipTitle,
                        { color: theme.colors.fg },
                      ]}
                      numberOfLines={2}
                    >
                      {t(`reminderForm.${preset.titleKey}`)}
                    </Text>
                    {summaryParts.length ? (
                      <View style={styles.presetChipSummaryWrap}>
                        {summaryParts.slice(0, 2).map((line, idx) => (
                          <Text
                            key={`${preset.titleKey}-summary-${idx}`}
                            style={[
                              styles.presetChipSummary,
                              { color: theme.colors.muted },
                            ]}
                            numberOfLines={1}
                          >
                            {line}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ height: theme.spacing.sm }} />
          </>
        ) : null}

        {/* Section 1: Title */}
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
            <View style={styles.rowLeft}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {t("reminderForm.titleLabel")}
              </Text>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("reminderForm.placeholderTitle")}
              placeholderTextColor={theme.colors.muted}
              editable={!saving}
              style={[
                styles.input,
                { color: theme.colors.fg, textAlign: "right" },
              ]}
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={{ height: theme.spacing.sm }} />

        {/* Section 2: Date reminder */}
        <View
          style={[
            styles.card,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {t("reminderForm.dateReminder")}
              </Text>
            </View>
            <Switch
              value={dateEnabled}
              onValueChange={setDateEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor="#fff"
            />
          </View>

          {dateEnabled && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <Pressable
                onPress={openDatePicker}
                disabled={saving}
                style={({ pressed }) => [
                  styles.row,
                  pressed && !saving ? { opacity: 0.85 } : null,
                ]}
              >
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("reminderForm.dueDateLabel")}
                </Text>
                <Text
                  style={[
                    styles.valueText,
                    { color: theme.colors.fg, textAlign: "right" },
                  ]}
                >
                  {dueDate}
                </Text>
              </Pressable>

              {datePickerOpen && (
                <View
                  style={[
                    styles.pickerWrap,
                    { borderTopColor: theme.colors.border },
                  ]}
                >
                  <DateTimePicker
                    value={datePickerDraft}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    themeVariant={
                      Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
                        ? "dark"
                        : "light"
                    }
                    onChange={(event, selected) => {
                      if (Platform.OS === "ios") {
                        if (selected) setDatePickerDraft(selected);
                        return;
                      }
                      setDatePickerOpen(false);
                      if ((event as { type?: string })?.type === "dismissed")
                        return;
                      if (selected) setDueDate(formatYmd(selected));
                    }}
                  />
                  {Platform.OS === "ios" ? (
                    <View style={styles.pickerActionsRow}>
                      <Pressable
                        onPress={() => setDatePickerOpen(false)}
                        style={({ pressed }) => [
                          styles.pickerActionBtn,
                          {
                            borderColor: theme.colors.border,
                            backgroundColor: "transparent",
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerActionText,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("common.cancel")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setDueDate(formatYmd(datePickerDraft));
                          setDatePickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.pickerActionBtn,
                          {
                            borderColor: theme.colors.accent,
                            backgroundColor: accentBg,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerActionText,
                            { color: theme.colors.accent },
                          ]}
                        >
                          {t("common.done")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              )}

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.row}>
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("reminderForm.daysBefore")}
                </Text>
                <TextInput
                  value={daysBefore}
                  onChangeText={setDaysBefore}
                  placeholder="7"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="number-pad"
                  editable={!saving}
                  style={[
                    styles.input,
                    { color: theme.colors.fg, textAlign: "right" },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="repeat-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("reminderForm.repeats")}
                  </Text>
                </View>
                <Switch
                  value={dateRepeats}
                  onValueChange={setDateRepeats}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor="#fff"
                />
              </View>

              {dateRepeats && (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text
                        style={[styles.label, { color: theme.colors.muted }]}
                        numberOfLines={1}
                      >
                        {t("reminderForm.every")}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <TextInput
                        value={recurrenceValue}
                        onChangeText={setRecurrenceValue}
                        placeholder="6"
                        placeholderTextColor={theme.colors.muted}
                        keyboardType="number-pad"
                        editable={!saving}
                        style={[
                          styles.input,
                          {
                            color: theme.colors.fg,
                            textAlign: "right",
                            flex: 0,
                            minWidth: 48,
                            maxWidth: 56,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => {
                          const unitLabels: Record<
                            ReminderRecurrenceUnit,
                            string
                          > = {
                            days: t("reminderForm.intervalDays"),
                            weeks: t("reminderForm.intervalWeeks"),
                            months: t("reminderForm.intervalMonths"),
                            years: t("reminderForm.intervalYears"),
                          };
                          Alert.alert(
                            t("reminderForm.every"),
                            "",
                            [
                              { text: t("common.cancel"), style: "cancel" },
                              ...RECURRENCE_UNITS.map((u) => ({
                                text: unitLabels[u.value],
                                onPress: () => setRecurrenceUnit(u.value),
                              })),
                            ],
                            { cancelable: true },
                          );
                        }}
                        style={({ pressed }) => [
                          {
                            backgroundColor: theme.colors.accent,
                            paddingVertical: 6,
                            paddingHorizontal: theme.spacing.sm,
                            borderRadius: 9999,
                            marginLeft: theme.spacing.sm,
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.valueText,
                            {
                              color: "#000000",
                              textAlign: "center",
                              fontWeight: theme.typography.fontWeight.bold,
                              fontSize: theme.typography.small,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {recurrenceUnitLabel}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <View style={{ height: theme.spacing.sm }} />

        {/* Section 3: Mileage reminder */}
        <View
          style={[
            styles.card,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {t("reminderForm.mileageReminder")}
              </Text>
            </View>
            <Switch
              value={mileageEnabled}
              onValueChange={setMileageEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor="#fff"
            />
          </View>

          {mileageEnabled && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.row}>
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("reminderForm.dueMileage", { unit: distanceUnit })}
                </Text>
                <TextInput
                  value={dueMileage}
                  onChangeText={setDueMileage}
                  placeholder={t("reminderForm.placeholderDueMileage")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="number-pad"
                  editable={!saving}
                  style={[
                    styles.input,
                    { color: theme.colors.fg, textAlign: "right" },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="repeat-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("reminderForm.repeats")}
                  </Text>
                </View>
                <Switch
                  value={mileageRepeats}
                  onValueChange={setMileageRepeats}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor="#fff"
                />
              </View>
              {mileageRepeats && (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Text
                      style={[styles.label, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {t("reminderForm.everyKm")}
                    </Text>
                    <TextInput
                      value={recurrenceKm}
                      onChangeText={setRecurrenceKm}
                      placeholder={t("reminderForm.placeholderEveryKm")}
                      placeholderTextColor={theme.colors.muted}
                      keyboardType="number-pad"
                      editable={!saving}
                      style={[
                        styles.input,
                        { color: theme.colors.fg, textAlign: "right" },
                      ]}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <View style={{ height: theme.spacing.sm }} />

        {/* Section 4: Notes */}
        <View
          style={[
            styles.card,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View
            style={{
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {t("reminderForm.notesLabel")}
              </Text>
            </View>
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder={t("reminderForm.placeholderNotes")}
              placeholderTextColor={theme.colors.muted}
              editable={!saving}
              multiline
              textAlignVertical="top"
              style={[
                styles.inputMultiline,
                { color: theme.colors.fg, paddingTop: theme.spacing.xs },
              ]}
            />
          </View>
        </View>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: theme.typography.largeTitle,
      marginVertical: theme.spacing.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    presetsSectionLabel: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
    },
    presetsScroll: {
      marginHorizontal: -theme.layout.contentPaddingHorizontal,
      maxHeight: 90,
    },
    presetsScrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      gap: theme.spacing.sm,
    },
    presetChip: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    presetChipTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    presetChipSummaryWrap: {
      marginTop: theme.spacing.sm,
    },
    presetChipSummary: {
      fontSize: theme.typography.small,
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
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
    },
    rowRight: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: theme.spacing.sm,
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
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    divider: {
      height: 1,
      width: "100%",
    },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
