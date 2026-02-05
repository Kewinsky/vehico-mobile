import { useEffect, useMemo, useState } from "react";
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
  const [distance, setDistance] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelType, setFuelType] = useState<FuelGrade | null>(null);
  const [gasStation, setGasStation] = useState<GasStation | null>(null);
  const [saving, setSaving] = useState(false);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent]
  );

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
      ]
    );
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
            style={({ pressed }) => [
              styles.pillButton,
              {
                borderColor: theme.colors.accent,
                backgroundColor: accentBg,
                opacity: !canSave || saving ? 0.5 : pressed ? 0.75 : 1,
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
        {entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle")}
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
        <Pressable
          onPress={() => setDatePickerOpen(true)}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {date}
          </Text>
        </Pressable>
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
              placeholderLabel: t("common.all"),
            })
          }
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {fuelType
              ? t(`fuelingForm.fuelTypes.${fuelType}`)
              : t("fuelingForm.fuelType")}
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
              placeholderLabel: t("common.all"),
            })
          }
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {gasStation
              ? t(`fuelingForm.stations.${gasStation}`)
              : t("fuelingForm.gasStation")}
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
              value={parseYmd(date)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, selectedDate) => {
                setDatePickerOpen(false);
                if (selectedDate) setDate(formatYmd(selectedDate));
              }}
            />
          </View>
        ) : null}
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
          <Ionicons
            name="speedometer-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("fuelingForm.distance", { unit: distanceUnit })}`,
              t("fuelingForm.placeholderDistance")
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="water-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={fuelAmount}
            onChangeText={setFuelAmount}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("fuelingForm.fuelAmount", { unit: fuelUnitLabel })}`,
              t("fuelingForm.placeholderFuelAmount")
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons name="card-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={fuelCost}
            onChangeText={setFuelCost}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("fuelingForm.cost")}`,
              t("fuelingForm.placeholderCost")
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
      </View>

      {entryId ? (
        <>
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
    divider: { height: 1, width: "100%" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
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
  });
