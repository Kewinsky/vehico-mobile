import { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  FUEL_TYPE_OPTIONS,
  GAS_STATION_OPTIONS,
  buildFuelingEntryPayload,
  canSaveFuelingEntry,
  fuelingEntryFieldErrors,
  type FuelingEntryFormState,
} from "../../forms/fuelingEntryForm";
import type { FuelGrade, GasStation } from "../../types/domain";
import {
  createFuelingEntry,
  deleteFuelingEntry,
  getFuelingEntry,
  listFuelingEntries,
  updateFuelingEntry,
} from "../../services/fuel/fuelingEntriesRepo";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useTheme } from "../../ui/ThemeProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { toastError } from "../../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { Droplet, Fuel } from "lucide-react-native";

type Props = NativeStackScreenProps<AppStackParamList, "FuelingEntryForm">;

export function FuelingEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId, entryId } = route.params;
  const { distanceUnitLabel, fuelUnitShort } = useUnitDisplay();
  const { settings } = useUserSettings();
  const fuelUnitLabel = fuelUnitShort;
  const currency = settings?.currency ?? "PLN";

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelType, setFuelType] = useState<FuelGrade | null>(null);
  const [gasStation, setGasStation] = useState<GasStation | null>(null);
  const [saving, setSaving] = useState(false);

  const formValues = useMemo(
    (): FuelingEntryFormState => ({
      date,
      distance,
      fuelAmount,
      fuelCost,
      fuelType,
      gasStation,
    }),
    [date, distance, fuelAmount, fuelCost, fuelType, gasStation],
  );

  const fieldErrors = useMemo(
    () => fuelingEntryFieldErrors(formValues),
    [formValues],
  );

  const canSave = useMemo(() => canSaveFuelingEntry(formValues), [formValues]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

  const load = useCallback(async () => {
    if (entryId) {
      try {
        const entry = await getFuelingEntry(entryId);
        setDate(entry.date);
        setDistance(entry.distance != null ? String(entry.distance) : "");
        setFuelAmount(String(entry.fuel_amount));
        setFuelCost(String(entry.fuel_cost));
        setFuelType(entry.fuel_type ?? null);
        setGasStation(entry.gas_station ?? null);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      }
      return;
    }

    try {
      const entries = await listFuelingEntries(vehicleId);
      const last = entries[0];
      if (!last) return;
      if (last.fuel_type != null) {
        setFuelType((prev) => prev ?? last.fuel_type);
      }
      if (last.gas_station != null) {
        setGasStation((prev) => prev ?? last.gas_station);
      }
    } catch (err: any) {
      toastError(err?.message ?? t("common.error"));
    }
  }, [entryId, vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
    resetFieldErrors();
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
    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }[] = [{ text: t("common.cancel"), style: "cancel" }];

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

    Alert.alert("", "", buttons, {
      cancelable: true,
    });
  }

  async function onSave() {
    if (!validateBeforeSave()) return;

    try {
      setSaving(true);
      const payload = buildFuelingEntryPayload(vehicleId, formValues);
      if (entryId) await updateFuelingEntry(entryId, payload);
      else await createFuelingEntry(payload);
      navigation.goBack();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving,
        loading: saving,
      }}
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
      <FormScreen noLayout>
        <NativeHeaderScrollView>
          <Card>
            <FormDateRow
              icon="calendar-outline"
              label={t("fuelingForm.date")}
              value={date}
              onChange={setDate}
              disabled={saving}
              error={fieldError(fieldErrors.date)}
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
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
                <View style={styles.rowLeft}>
                  <Fuel size={20} color={theme.colors.accent} />
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
              </CardRow>
            </Pressable>

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
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
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
              </CardRow>
            </Pressable>
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          <Card>
            <FormInputRow
              icon="speedometer-outline"
              label={t("fuelingForm.distance", { unit: distanceUnitLabel })}
              value={distance}
              onChangeText={setDistance}
              decimal
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("fuelingForm.placeholderDistance")}
              error={fieldError(fieldErrors.distance)}
            />

            <FormInputRow
              iconComponent={<Droplet size={20} color={theme.colors.accent} />}
              label={t("fuelingForm.fuelAmount", { unit: fuelUnitLabel })}
              value={fuelAmount}
              onChangeText={setFuelAmount}
              decimal
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("fuelingForm.placeholderFuelAmount")}
              error={fieldError(fieldErrors.fuelAmount)}
            />

            <FormInputRow
              icon="card-outline"
              label={t("fuelingForm.cost", { unit: currency })}
              value={fuelCost}
              onChangeText={setFuelCost}
              decimal
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("fuelingForm.placeholderCost")}
              error={fieldError(fieldErrors.fuelCost)}
            />
          </Card>
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
  });
