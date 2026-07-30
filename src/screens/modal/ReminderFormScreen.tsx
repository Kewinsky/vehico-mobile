import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  buildReminderPayload,
  canSaveReminder,
  RECURRENCE_UNITS,
  reminderFieldErrors,
  type ReminderFormState,
} from "../../forms/reminderForm";
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
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { useTheme } from "../../ui/ThemeProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastCaughtError, toastSuccess } from "../../ui/toast/toast";
import { promptAddServiceEntryFromReminder } from "../../services/reminders/reminderServiceEntryPrompt";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";
import { Ionicons } from "@expo/vector-icons";
import { Textarea } from "../../ui/components/common/Textarea";
import {
  REMINDER_PRESETS,
  getPresetDueDate,
  type ReminderPreset,
} from "../reminderPresets";
import { ModalLayout } from "../../layouts";
import { Card, CardDivider, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormInlineMenuPicker } from "../../ui/components/common/FormInlineMenuPicker";
import { FormSwitch } from "../../ui/components/common/FormSwitch";
import { SquarePen } from "lucide-react-native";
import { groupThousands } from "../../utils/numberFormatting";

type Props = NativeStackScreenProps<AppStackParamList, "ReminderForm">;

export function ReminderFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { isPremium, remindersLimit, freePlanVehicleId, freePlanReminderIds } =
    useEntitlements();
  const styles = makeStyles(theme);
  const { vehicleId, reminderId } = route.params;
  const { distanceUnitLabel } = useUnitDisplay();

  const [status, setStatus] = useState<ReminderStatus>("active");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dateEnabled, setDateEnabled] = useState(false);
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
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
  const [initialStatus, setInitialStatus] = useState<ReminderStatus>("active");

  const formValues = useMemo(
    (): ReminderFormState => ({
      status,
      title,
      notes,
      dateEnabled,
      dueDate,
      daysBefore,
      dateRepeats,
      recurrenceValue,
      recurrenceUnit,
      mileageEnabled,
      dueMileage,
      mileageRepeats,
      recurrenceKm,
    }),
    [
      status,
      title,
      notes,
      dateEnabled,
      dueDate,
      daysBefore,
      dateRepeats,
      recurrenceValue,
      recurrenceUnit,
      mileageEnabled,
      dueMileage,
      mileageRepeats,
      recurrenceKm,
    ],
  );

  const fieldErrors = useMemo(
    () => reminderFieldErrors(formValues),
    [formValues],
  );

  const canSave = useMemo(() => canSaveReminder(formValues), [formValues]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

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
          value: groupThousands(preset.recurrenceKm, 0, i18n.language),
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

  useEffect(() => {
    if (!reminderId) return;
    void (async () => {
      try {
        const r = await getReminder(reminderId);
        setStatus(r.status);
        setInitialStatus(r.status);
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
        toastCaughtError(err, t("common.error"));
      }
    })();
  }, [reminderId, t]);

  function clearForm() {
    resetFieldErrors();
    setTitle("");
    setNotes("");
    setDateEnabled(false);
    setDueDate(new Date().toISOString().slice(0, 10));
    setDaysBefore("7");
    setDateRepeats(false);
    setRecurrenceValue("6");
    setRecurrenceUnit("months");
    setMileageEnabled(false);
    setDueMileage("");
    setMileageRepeats(false);
    setRecurrenceKm("");
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
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
    );
  }

  async function onSave() {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
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
            getPremiumUpgradeAlertButtons(t, navigation),
          );
          return;
        }
      }

      const payload = buildReminderPayload(vehicleId, formValues);

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

      const markedDoneNow = saved.status === "done" && initialStatus !== "done";
      if (markedDoneNow) {
        promptAddServiceEntryFromReminder(saved, t, {
          onCreated: () =>
            toastSuccess(t("reminders.serviceEntryFromReminderCreated")),
          onError: (e) => toastCaughtError(e, t("common.error")),
          onDismiss: () => navigation.goBack(),
        });
      } else {
        navigation.goBack();
      }
    } catch (e: unknown) {
      if (handleAndShowLimitErrorAlert(e, t, navigation)) return;
      toastCaughtError(e, t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  const recurrenceUnitOptions = useMemo(
    () => RECURRENCE_UNITS.map((unit) => unit.value),
    [],
  );

  const getRecurrenceUnitLabel = useCallback(
    (unit: ReminderRecurrenceUnit) => {
      switch (unit) {
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
    },
    [t],
  );

  return (
    <ModalLayout
      title={
        reminderId ? t("reminderForm.editTitle") : t("reminderForm.addTitle")
      }
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving,
        loading: saving,
      }}
      useHorizontalContentInset={false}
      footer={
        <View style={styles.footerAction}>
          {reminderId ? (
            <Button variant="destructive" onPress={confirmDelete}>
              {t("common.delete")}
            </Button>
          ) : (
            <Button variant="outlined" onPress={clearForm} disabled={saving}>
              {t("common.clearButton")}
            </Button>
          )}
        </View>
      }
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView>
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

          {reminderId ? (
            <View style={styles.segmentTabs}>
              <SegmentTabs
                value={status}
                variant="secondary"
                options={[
                  {
                    value: "active" as ReminderStatus,
                    label: t("reminderDetail.status.active"),
                  },
                  {
                    value: "done" as ReminderStatus,
                    label: t("reminderDetail.status.done"),
                  },
                ]}
                onChange={setStatus}
                size="md"
              />
              <View style={{ height: theme.spacing.sm }} />
            </View>
          ) : null}

          {/* Section 1: Title */}
          <Card style={styles.card}>
            <FormInputRow
              icon="document-text-outline"
              label={t("reminderForm.titleLabel")}
              value={title}
              onChangeText={setTitle}
              placeholder={t("reminderForm.placeholderTitle")}
              editable={!saving}
              autoCorrect={false}
              error={fieldError(fieldErrors.title)}
            />
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          {/* Section 2: Date reminder */}
          <Card style={styles.card}>
            <CardRow
              style={{ justifyContent: "space-between" }}
              error={fieldError(fieldErrors.reminderType)}
            >
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
              <FormSwitch
                value={dateEnabled}
                onValueChange={setDateEnabled}
                disabled={saving}
              />
            </CardRow>
            {dateEnabled && (
              <>
                <FormDateRow
                  label={t("reminderForm.dueDateLabel")}
                  value={dueDate}
                  onChange={setDueDate}
                  disabled={saving}
                  error={fieldError(fieldErrors.dueDate)}
                />

                <CardDivider />

                <FormInputRow
                  label={t("reminderForm.daysBefore")}
                  value={daysBefore}
                  onChangeText={setDaysBefore}
                  placeholder="7"
                  keyboardType="number-pad"
                  editable={!saving}
                  error={fieldError(fieldErrors.daysBefore)}
                />
                <CardDivider />
                <CardRow style={{ justifyContent: "space-between" }}>
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
                  <FormSwitch
                    value={dateRepeats}
                    onValueChange={setDateRepeats}
                    disabled={saving}
                  />
                </CardRow>
                {dateRepeats && <CardDivider />}
                {dateRepeats && (
                  <CardRow error={fieldError(fieldErrors.recurrence)}>
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
                      <FormInlineMenuPicker<ReminderRecurrenceUnit>
                        value={recurrenceUnit}
                        options={recurrenceUnitOptions}
                        getLabel={getRecurrenceUnitLabel}
                        onChange={setRecurrenceUnit}
                        disabled={saving}
                      />
                    </View>
                  </CardRow>
                )}
              </>
            )}
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          {/* Section 3: Mileage reminder */}
          <Card style={styles.card}>
            <CardRow
              style={{ justifyContent: "space-between" }}
              error={fieldError(fieldErrors.reminderType)}
            >
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
              <FormSwitch
                value={mileageEnabled}
                onValueChange={setMileageEnabled}
                disabled={saving}
              />
            </CardRow>
            {mileageEnabled && (
              <>
                <FormInputRow
                  label={t("reminderForm.dueMileage", {
                    unit: distanceUnitLabel,
                  })}
                  value={dueMileage}
                  onChangeText={setDueMileage}
                  placeholder={t("reminderForm.placeholderDueMileage")}
                  keyboardType="number-pad"
                  editable={!saving}
                  error={fieldError(fieldErrors.dueMileage)}
                />
                <CardDivider />
                <CardRow style={{ justifyContent: "space-between" }}>
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
                  <FormSwitch
                    value={mileageRepeats}
                    onValueChange={setMileageRepeats}
                    disabled={saving}
                  />
                </CardRow>
                {mileageRepeats && <CardDivider />}
                {mileageRepeats && (
                  <FormInputRow
                    label={t("reminderForm.everyKm")}
                    value={recurrenceKm}
                    onChangeText={setRecurrenceKm}
                    placeholder={t("reminderForm.placeholderEveryKm")}
                    keyboardType="number-pad"
                    editable={!saving}
                    error={fieldError(fieldErrors.recurrenceKm)}
                  />
                )}
              </>
            )}
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          {/* Section 4: Notes */}
          <Card style={styles.card}>
            <View
              style={{
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <View style={styles.rowLeft}>
                <SquarePen size={20} color={theme.colors.accent} />
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
          </Card>
        </NativeHeaderScrollView>
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
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    presetsScroll: {
      maxHeight: 90,
    },
    presetsScrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      gap: theme.spacing.sm,
    },
    presetChip: {
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
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
      marginHorizontal: theme.layout.contentPaddingHorizontal,
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
    },
    segmentTabs: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
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
    footerAction: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
  });
