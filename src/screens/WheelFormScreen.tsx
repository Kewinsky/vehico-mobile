import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { isPositiveNumber, isValidEt, parseDecimal } from "../utils/validation";
import {
  createVehicleWheel,
  getVehicleWheel,
  updateVehicleWheel,
} from "../services/wheels/wheelsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "WheelForm">;

export function WheelFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, wheelId } = route.params;

  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [diameter, setDiameter] = useState("");
  const [etOffset, setEtOffset] = useState("");
  const [boltPattern, setBoltPattern] = useState("");
  const [centerBore, setCenterBore] = useState("");
  const [boltType, setBoltType] = useState("");
  const [weight, setWeight] = useState("");
  const [isCurrentlyFitted, setIsCurrentlyFitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!wheelId) return;
    void (async () => {
      try {
        const wheel = await getVehicleWheel(wheelId);
        setName(wheel.name);
        setWidth(String(wheel.width_inch));
        setDiameter(String(wheel.diameter_inch));
        setEtOffset(wheel.et_offset != null ? String(wheel.et_offset) : "");
        setBoltPattern(wheel.bolt_pattern ?? "");
        setCenterBore(
          wheel.center_bore_mm != null ? String(wheel.center_bore_mm) : "",
        );
        setBoltType(wheel.bolt_type ?? "");
        setWeight(wheel.weight_kg != null ? String(wheel.weight_kg) : "");
        setIsCurrentlyFitted(wheel.is_currently_fitted);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      }
    })();
  }, [wheelId, t]);

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      isPositiveNumber(width) &&
      isPositiveNumber(diameter) &&
      isValidEt(etOffset)
    );
  }, [name, width, diameter, etOffset]);

  async function onSave() {
    try {
      setSaving(true);
      const widthNum = Number(width.trim());
      const diameterNum = Number(diameter.trim());
      if (!Number.isFinite(widthNum) || widthNum <= 0) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (!Number.isFinite(diameterNum) || diameterNum <= 0) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (!isValidEt(etOffset)) {
        toastError(t("validation.etInvalid"));
        return;
      }
      const payload = {
        vehicle_id: vehicleId,
        name: name.trim(),
        width_inch: widthNum,
        diameter_inch: diameterNum,
        et_offset: etOffset.trim() ? Number(etOffset.trim()) : null,
        bolt_pattern: boltPattern.trim() || null,
        center_bore_mm: parseDecimal(centerBore),
        bolt_type: boltType.trim() || null,
        weight_kg: parseDecimal(weight),
        is_currently_fitted: isCurrentlyFitted,
      };
      if (wheelId) {
        await updateVehicleWheel(wheelId, payload);
      } else {
        await createVehicleWheel(payload);
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
        <AppHeader
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              onPress={() => {
                if (canSave && !saving) void onSave();
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
        {wheelId ? t("wheelForm.editTitle") : t("wheelForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.lg }} />

      <TextField
        noMarginTop
        label={`${t("wheelForm.name")} *`}
        value={name}
        onChangeText={setName}
        placeholder={t("wheelForm.placeholderName")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={`${t("wheelForm.width")} *`}
        value={width}
        onChangeText={setWidth}
        placeholder={t("wheelForm.placeholderWidth")}
        keyboardType="decimal-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={`${t("wheelForm.diameter")} *`}
        value={diameter}
        onChangeText={setDiameter}
        placeholder={t("wheelForm.placeholderDiameter")}
        keyboardType="number-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("wheelForm.etOffset")}
        value={etOffset}
        onChangeText={setEtOffset}
        placeholder={t("wheelForm.placeholderEtOffset")}
        keyboardType="number-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("wheelForm.boltPattern")}
        value={boltPattern}
        onChangeText={setBoltPattern}
        placeholder={t("wheelForm.placeholderBoltPattern")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("wheelForm.centerBore")}
        value={centerBore}
        onChangeText={setCenterBore}
        placeholder={t("wheelForm.placeholderCenterBore")}
        keyboardType="decimal-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("wheelForm.boltType")}
        value={boltType}
        onChangeText={setBoltType}
        placeholder={t("wheelForm.placeholderBoltType")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("wheelForm.weight")}
        value={weight}
        onChangeText={setWeight}
        placeholder={t("wheelForm.placeholderWeight")}
        keyboardType="decimal-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: theme.colors.fg }]}>
          {t("wheelForm.isCurrentlyFitted")}
        </Text>
        <Switch
          value={isCurrentlyFitted}
          onValueChange={setIsCurrentlyFitted}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.accent,
          }}
          thumbColor="#fff"
        />
      </View>
    </FormScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    h1: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    switchLabel: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
  });
}
