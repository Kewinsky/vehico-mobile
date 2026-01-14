import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  createFuelingEntry,
  getFuelingEntry,
  updateFuelingEntry,
} from "../services/fuel/fuelingEntriesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

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
      } catch (err: any) {
        Alert.alert(t("common.error"), err?.message ?? String(err));
      }
    })();
  }, [entryId, t]);

  const canSave = useMemo(() => {
    return (
      date.trim().length === 10 &&
      Number(distance) > 0 &&
      Number(fuelAmount) > 0 &&
      Number(fuelCost) >= 0
    );
  }, [date, distance, fuelAmount, fuelCost]);

  async function onSave() {
    try {
      setSaving(true);
      const payload = {
        vehicle_id: vehicleId,
        date: date.trim(),
        distance: Number(distance),
        fuel_amount: Number(fuelAmount),
        fuel_cost: Number(fuelCost),
      };
      if (entryId) await updateFuelingEntry(entryId, payload);
      else await createFuelingEntry(payload as any);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>
        {entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle")}
      </Text>

      <View style={{ height: 14 }} />
      <TextField
        noMarginTop
        label={t("fuelingForm.date")}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
      />

      <TextField
        label={t("fuelingForm.distance", { unit: distanceUnit })}
        value={distance}
        onChangeText={setDistance}
        keyboardType="decimal-pad"
      />

      <TextField
        label={t("fuelingForm.fuelAmount", { unit: fuelUnit })}
        value={fuelAmount}
        onChangeText={setFuelAmount}
        keyboardType="decimal-pad"
      />

      <TextField
        label={t("fuelingForm.cost")}
        value={fuelCost}
        onChangeText={setFuelCost}
        keyboardType="decimal-pad"
      />

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
  });
