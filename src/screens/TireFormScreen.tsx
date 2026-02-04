import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { TireType } from "../types/domain";
import { isPositiveNumber, isValidDot } from "../utils/validation";
import {
  createVehicleTire,
  getVehicleTire,
  updateVehicleTire,
} from "../services/tires/tiresRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "TireForm">;

const TIRE_TYPES: TireType[] = [
  "summer",
  "winter",
  "all_season",
  "run_flat",
  "uhp",
  "suv_xl",
];

export function TireFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, tireId } = route.params;

  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [profile, setProfile] = useState("");
  const [diameter, setDiameter] = useState("");
  const [tireType, setTireType] = useState<TireType | null>("summer");
  const [dot, setDot] = useState("");
  const [isCurrentlyFitted, setIsCurrentlyFitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tireId) return;
    void (async () => {
      try {
        const tire = await getVehicleTire(tireId);
        setName(tire.name);
        setWidth(String(tire.width_mm));
        setProfile(String(tire.aspect_ratio));
        setDiameter(String(tire.diameter_inch));
        setTireType(tire.tire_type);
        setDot(tire.dot ?? "");
        setIsCurrentlyFitted(tire.is_currently_fitted);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      }
    })();
  }, [tireId, t]);

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      isPositiveNumber(width) &&
      isPositiveNumber(profile) &&
      isPositiveNumber(diameter) &&
      tireType != null &&
      isValidDot(dot)
    );
  }, [name, width, profile, diameter, tireType, dot]);

  async function onSave() {
    try {
      setSaving(true);
      const widthNum = Number(width.trim());
      const profileNum = Number(profile.trim());
      const diameterNum = Number(diameter.trim());
      if (!Number.isFinite(widthNum) || widthNum <= 0) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (!Number.isFinite(profileNum) || profileNum <= 0) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (!Number.isFinite(diameterNum) || diameterNum <= 0) {
        toastError(t("validation.positiveRequired"));
        return;
      }
      if (!isValidDot(dot)) {
        toastError(t("validation.dotInvalid"));
        return;
      }
      const payload = {
        vehicle_id: vehicleId,
        name: name.trim(),
        width_mm: widthNum,
        aspect_ratio: profileNum,
        diameter_inch: diameterNum,
        tire_type: tireType!,
        dot: dot.trim() || null,
        is_currently_fitted: isCurrentlyFitted,
      };
      if (tireId) {
        await updateVehicleTire(tireId, payload);
      } else {
        await createVehicleTire(payload);
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
        {tireId ? t("tireForm.editTitle") : t("tireForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.lg }} />

      <TextField
        noMarginTop
        label={`${t("tireForm.name")} *`}
        value={name}
        onChangeText={setName}
        placeholder={t("tireForm.placeholderName")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={`${t("tireForm.width")} *`}
        value={width}
        onChangeText={setWidth}
        keyboardType="number-pad"
        placeholder={t("tireForm.placeholderWidth")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={`${t("tireForm.profile")} *`}
        value={profile}
        onChangeText={setProfile}
        keyboardType="number-pad"
        placeholder={t("tireForm.placeholderProfile")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={`${t("tireForm.diameter")} *`}
        value={diameter}
        onChangeText={setDiameter}
        keyboardType="number-pad"
        placeholder={t("tireForm.placeholderDiameter")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <PickerField<TireType>
        noMarginTop
        label={`${t("tireForm.tireType")} *`}
        value={tireType}
        options={TIRE_TYPES}
        getLabel={(v) => t(`tireForm.types.${v}`)}
        onChange={setTireType}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("tireForm.dot")}
        value={dot}
        onChangeText={setDot}
        placeholder={t("tireForm.placeholderDot")}
        keyboardType="number-pad"
      />
      <View style={{ height: theme.spacing.sm }} />
      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: theme.colors.fg }]}>
          {t("tireForm.isCurrentlyFitted")}
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
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
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
