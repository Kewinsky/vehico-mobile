import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { isValidDate, isPositiveNumber } from "../utils/validation";
import type { FuelGrade, GasStation } from "../types/domain";
import {
  createFuelingEntry,
  deleteFuelingEntry,
  getFuelingEntry,
  updateFuelingEntry,
} from "../services/fuel/fuelingEntriesRepo";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { ModalButton } from "../ui/components/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

const FUEL_TYPE_OPTIONS: readonly FuelGrade[] = [
  "95",
  "98",
  "100",
  "on",
  "lpg",
];

const GAS_STATION_OPTIONS: readonly GasStation[] = [
  "orlen",
  "bp",
  "shell",
  "circle_k",
  "mol",
  "moya",
  "other",
];

type Props = NativeStackScreenProps<AppStackParamList, "FuelingEntryForm">;

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

export function FuelingEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = makeStyles(theme);
  const { vehicleId, entryId } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";
  const fuelUnitLabel =
    fuelUnit === "liters"
      ? t("dashboard.stats.units.liters")
      : t("dashboard.stats.units.gallons");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(
    () => new Date(),
  );
  const [distance, setDistance] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelType, setFuelType] = useState<FuelGrade | null>(null);
  const [gasStation, setGasStation] = useState<GasStation | null>(null);
  const [saving, setSaving] = useState(false);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  function openDatePicker() {
    setDatePickerDraft(parseYmd(date));
    setDatePickerOpen(true);
  }

  useEffect(() => {
    if (!entryId) return;
    void (async () => {
      try {
        const e = await getFuelingEntry(entryId);
        setDate(e.date);
        setDistance(String(e.distance));
        setFuelAmount(String(e.fuel_amount));
        setFuelCost(String(e.fuel_cost));
        setFuelType(e.fuel_type ?? null);
        setGasStation(e.gas_station ?? null);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      }
    })();
  }, [entryId, t]);

  const canSave = useMemo(() => {
    return (
      isValidDate(date) &&
      isPositiveNumber(distance) &&
      isPositiveNumber(fuelAmount) &&
      isPositiveNumber(fuelCost)
    );
  }, [date, distance, fuelAmount, fuelCost]);

  function confirmDelete() {
    if (!entryId) return;
    Alert.alert(
      t("fuelCosts.deleteFuelingTitle"),
      t("fuelCosts.deleteFuelingBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFuelingEntry(entryId);
              navigation.goBack();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }

  function clearForm() {
    setDate(new Date().toISOString().slice(0, 10));
    setDistance("");
    setFuelAmount("");
    setFuelCost("");
    setFuelType(null);
    setGasStation(null);
  }

  function showPicker<T extends string>(opts: {
    title: string;
    value: T | null;
    options: readonly T[];
    getLabel: (v: T) => string;
    onChange: (v: T | null) => void;
    placeholderLabel?: string;
  }) {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }> = [{ text: t("common.cancel"), style: "cancel" }];

    if (opts.placeholderLabel) {
      buttons.push({
        text: opts.placeholderLabel,
        onPress: () => opts.onChange(null),
      });
    }

    opts.options.forEach((opt) => {
      buttons.push({
        text: opts.getLabel(opt),
        onPress: () => opts.onChange(opt),
      });
    });

    Alert.alert(opts.title, "", buttons, { cancelable: true });
  }

  async function onSave() {
    try {
      setSaving(true);
      if (!isValidDate(date)) {
        toastError(t("validation.invalidDate"));
        return;
      }
      if (
        !isPositiveNumber(distance) ||
        !isPositiveNumber(fuelAmount) ||
        !isPositiveNumber(fuelCost)
      ) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      const payload = {
        vehicle_id: vehicleId,
        date: date.trim(),
        distance: Number(distance),
        fuel_amount: Number(fuelAmount),
        fuel_cost: Number(fuelCost),
        fuel_type: fuelType,
        gas_station: gasStation,
      };
      if (entryId) await updateFuelingEntry(entryId, payload);
      else await createFuelingEntry(payload as any);
      navigation.goBack();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle"),
      headerBackVisible: false,
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTitleStyle: { color: theme.colors.fg },
      headerLeft: () => (
        <ModalButton variant="cancel" onPress={() => navigation.goBack()}>
          {t("common.cancel")}
        </ModalButton>
      ),
      headerRight: () => (
        <ModalButton
          variant="done"
          onPress={onSave}
          disabled={!canSave || saving}
        >
          {t("common.done")}
        </ModalButton>
      ),
    });
  }, [navigation, t, theme.colors.bg, theme.colors.fg, entryId, canSave, saving, onSave]);

  return (
    <FormScreen
      isModal
      footer={
        entryId ? (
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
      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <Pressable
          onPress={openDatePicker}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
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
              {t("fuelingForm.date")}
            </Text>
          </View>
          <Text
            style={[
              styles.valueText,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
            numberOfLines={1}
          >
            {date}
          </Text>
        </Pressable>

        {datePickerOpen ? (
          <View
            style={[
              styles.pickerWrap,
              {
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
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
              onChange={(event, selectedDate) => {
                if (Platform.OS === "ios") {
                  if (selectedDate) setDatePickerDraft(selectedDate);
                  return;
                }

                setDatePickerOpen(false);
                if ((event as any)?.type === "dismissed") return;
                if (selectedDate) setDate(formatYmd(selectedDate));
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
                    setDate(formatYmd(datePickerDraft));
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
        ) : null}

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Pressable
          onPress={() =>
            showPicker<FuelGrade>({
              title: t("fuelingForm.fuelType"),
              value: fuelType,
              options: FUEL_TYPE_OPTIONS,
              getLabel: (v) => t(`fuelingForm.fuelTypes.${v}`),
              onChange: setFuelType,
              placeholderLabel: t("fuelingForm.fuelPlaceholder"),
            })
          }
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="options-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("fuelingForm.fuelType")}
            </Text>
          </View>
          <Text
            style={[
              styles.valueText,
              {
                color: fuelType ? theme.colors.fg : theme.colors.muted,
                textAlign: "right",
              },
            ]}
            numberOfLines={1}
          >
            {fuelType
              ? t(`fuelingForm.fuelTypes.${fuelType}`)
              : t("fuelingForm.fuelPlaceholder")}
          </Text>
        </Pressable>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Pressable
          onPress={() =>
            showPicker<GasStation>({
              title: t("fuelingForm.gasStation"),
              value: gasStation,
              options: GAS_STATION_OPTIONS,
              getLabel: (v) => t(`fuelingForm.stations.${v}`),
              onChange: setGasStation,
              placeholderLabel: t("fuelingForm.gasStationPlaceholder"),
            })
          }
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="location-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("fuelingForm.gasStation")}
            </Text>
          </View>
          <Text
            style={[
              styles.valueText,
              {
                color: gasStation ? theme.colors.fg : theme.colors.muted,
                textAlign: "right",
              },
            ]}
            numberOfLines={1}
          >
            {gasStation
              ? t(`fuelingForm.stations.${gasStation}`)
              : t("fuelingForm.gasStationPlaceholder")}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: theme.spacing.sm }} />

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
              name="speedometer-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("fuelingForm.distance", { unit: distanceUnit })}
            </Text>
          </View>
          <TextInput
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("fuelingForm.placeholderDistance")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="water-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("fuelingForm.fuelAmount", { unit: fuelUnitLabel })}
            </Text>
          </View>
          <TextInput
            value={fuelAmount}
            onChangeText={setFuelAmount}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("fuelingForm.placeholderFuelAmount")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="card-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("fuelingForm.cost")}
            </Text>
          </View>
          <TextInput
            value={fuelCost}
            onChangeText={setFuelCost}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("fuelingForm.placeholderCost")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </View>
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
    },
    divider: { height: 1, width: "100%" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
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
