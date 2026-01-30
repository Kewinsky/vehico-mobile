import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { isValidDate, isPositiveNumber } from "../utils/validation";
import type { GasStation } from "../types/domain";
import {
  createFuelingEntry,
  getFuelingEntry,
  updateFuelingEntry,
} from "../services/fuel/fuelingEntriesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { DateField } from "../ui/components/DateField";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PickerField } from "../ui/components/PickerField";

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

export function FuelingEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = makeStyles(theme);
  const { vehicleId, entryId } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [gasStation, setGasStation] = useState<GasStation | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    void (async () => {
      try {
        const e = await getFuelingEntry(entryId);
        setDate(e.date);
        setDistance(String(e.distance));
        setFuelAmount(String(e.fuel_amount));
        setFuelCost(String(e.fuel_cost));
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
        {entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.sm }} />
      <DateField
        noMarginTop
        label={`${t("fuelingForm.date")} *`}
        value={date}
        onChange={setDate}
        disabled={saving}
      />

      <TextField
        label={`${t("fuelingForm.distance", { unit: distanceUnit })} *`}
        value={distance}
        onChangeText={setDistance}
        keyboardType="decimal-pad"
        placeholder={t("fuelingForm.placeholderDistance")}
      />

      <TextField
        label={`${t("fuelingForm.fuelAmount", { unit: fuelUnit })} *`}
        value={fuelAmount}
        onChangeText={setFuelAmount}
        keyboardType="decimal-pad"
        placeholder={t("fuelingForm.placeholderFuelAmount")}
      />

      <TextField
        label={`${t("fuelingForm.cost")} *`}
        value={fuelCost}
        onChangeText={setFuelCost}
        keyboardType="decimal-pad"
        placeholder={t("fuelingForm.placeholderCost")}
      />

      <PickerField<GasStation>
        label={t("fuelingForm.gasStation")}
        value={gasStation}
        options={GAS_STATION_OPTIONS}
        getLabel={(value) => t(`fuelingForm.stations.${value}`)}
        onChange={setGasStation}
        placeholder={t("common.all")}
      />
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
  });
