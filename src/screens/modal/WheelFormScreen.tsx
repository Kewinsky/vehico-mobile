import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Weight } from "lucide-react-native";

import { usePremiumNavigation } from "../../core/hooks/usePremiumNavigation";
import {
  buildWheelPayload,
  canSaveWheel,
  wheelFieldErrors,
  type WheelFormState,
} from "../../forms/wheelForm";
import {
  createVehicleWheel,
  deleteVehicleWheel,
  getVehicleWheel,
  updateVehicleWheel,
  listVehicleWheels,
} from "../../services/wheels/wheelsRepo";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormSwitch } from "../../ui/components/common/FormSwitch";
import { useFormFieldErrors } from "../../core/hooks/useFormFieldErrors";
import { useEntitlements } from "../../core/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";
import { BoltPatternIcon } from "../../ui/components/icons/BoltPatternIcon";
import { BoltTypeIcon } from "../../ui/components/icons/BoltTypeIcon";
import { EtOffsetIcon } from "../../ui/components/icons/EtOffsetIcon";

export function WheelFormScreen() {
  const router = useRouter();
  const premiumNavigation = usePremiumNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    isPremium,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanWheelId,
  } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const params = useLocalSearchParams<{ vehicleId: string; wheelId: string }>();
  const vehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;
  const wheelIdParam = Array.isArray(params.wheelId) ? params.wheelId[0] : params.wheelId;
  const wheelId = wheelIdParam === "new" ? undefined : wheelIdParam;
  const wheelOptions = isPremium
    ? undefined
    : freePlanVehicleId === vehicleId
      ? { freePlanWheelId: freePlanWheelId ?? null }
      : { limit: wheelsPerVehicleLimit };

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

  const formValues = useMemo(
    (): WheelFormState => ({
      name,
      width,
      diameter,
      etOffset,
      boltPattern,
      centerBore,
      boltType,
      weight,
      isCurrentlyFitted,
    }),
    [
      name,
      width,
      diameter,
      etOffset,
      boltPattern,
      centerBore,
      boltType,
      weight,
      isCurrentlyFitted,
    ],
  );

  const fieldErrors = useMemo(() => wheelFieldErrors(formValues), [formValues]);

  const canSave = useMemo(() => canSaveWheel(formValues), [formValues]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

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

  function confirmDelete() {
    if (!wheelId) return;
    Alert.alert(t("wheels.deleteWheelTitle"), t("wheels.deleteWheelBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVehicleWheel(wheelId);
            router.back();
          } catch (e: any) {
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  function clearForm() {
    resetFieldErrors();
    setName("");
    setWidth("");
    setDiameter("");
    setEtOffset("");
    setBoltPattern("");
    setCenterBore("");
    setBoltType("");
    setWeight("");
    setIsCurrentlyFitted(false);
  }

  async function onSave() {
    if (!vehicleId || !validateBeforeSave()) return;
    try {
      setSaving(true);
      if (!wheelId && !isPremium) {
        const wheels = await listVehicleWheels(vehicleId, wheelOptions);
        if (wheels.length >= wheelsPerVehicleLimit) {
          Alert.alert(
            t("limits.wheelLimitReachedTitle"),
            t("limits.wheelLimitReachedBody", { limit: wheelsPerVehicleLimit }),
            getPremiumUpgradeAlertButtons(t, premiumNavigation),
          );
          return;
        }
      }

      const payload = buildWheelPayload(vehicleId, formValues);
      if (wheelId) {
        await updateVehicleWheel(wheelId, payload);
      } else {
        await createVehicleWheel(payload);
      }
      router.back();
    } catch (e: any) {
      if (e?.message === "FITTED_WHEEL_LIMIT_REACHED") {
        Alert.alert(
          t("limits.fittedWheelLimitReachedTitle"),
          t("limits.fittedWheelLimitReachedBody"),
        );
      } else if (handleAndShowLimitErrorAlert(e, t, premiumNavigation)) {
        return;
      } else {
        toastError(e?.message ?? t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={wheelId ? t("wheelForm.editTitle") : t("wheelForm.addTitle")}
      cancel={{ onPress: () => router.back(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving,
        loading: saving,
      }}
      footer={
        wheelId ? (
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
            <FormInputRow
              icon="pricetag-outline"
              label={t("wheelForm.name")}
              value={name}
              onChangeText={setName}
              editable={!saving}
              placeholder={t("wheelForm.placeholderName")}
              error={fieldError(fieldErrors.name)}
            />
            <FormInputRow
              iconComponent={
                <AntDesign
                  name="column-width"
                  size={20}
                  color={theme.colors.accent}
                />
              }
              label={t("wheelForm.width")}
              value={width}
              onChangeText={setWidth}
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("wheelForm.placeholderWidth")}
              error={fieldError(fieldErrors.width)}
            />
            <FormInputRow
              iconComponent={
                <MaterialCommunityIcons
                  name="diameter-variant"
                  size={20}
                  color={theme.colors.accent}
                />
              }
              label={t("wheelForm.diameter")}
              value={diameter}
              onChangeText={setDiameter}
              keyboardType="number-pad"
              editable={!saving}
              placeholder={t("wheelForm.placeholderDiameter")}
              error={fieldError(fieldErrors.diameter)}
            />
            <FormInputRow
              iconComponent={
                <EtOffsetIcon
                  size={20}
                  color={theme.colors.accent}
                  dotColor={theme.colors.bg}
                />
              }
              label={t("wheelForm.etOffset")}
              value={etOffset}
              onChangeText={setEtOffset}
              keyboardType="number-pad"
              editable={!saving}
              placeholder={t("wheelForm.placeholderEtOffset")}
              error={fieldError(fieldErrors.etOffset)}
            />
            <FormInputRow
              iconComponent={<BoltPatternIcon size={20} color={theme.colors.accent} />}
              label={t("wheelForm.boltPattern")}
              value={boltPattern}
              onChangeText={setBoltPattern}
              editable={!saving}
              placeholder={t("wheelForm.placeholderBoltPattern")}
            />
            <FormInputRow
              icon="radio-button-on-outline"
              label={t("wheelForm.centerBore")}
              value={centerBore}
              onChangeText={setCenterBore}
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("wheelForm.placeholderCenterBore")}
            />
            <FormInputRow
              iconComponent={<BoltTypeIcon size={20} color={theme.colors.accent} />}
              label={t("wheelForm.boltType")}
              value={boltType}
              onChangeText={setBoltType}
              editable={!saving}
              placeholder={t("wheelForm.placeholderBoltType")}
            />
            <FormInputRow
              iconComponent={<Weight size={20} color={theme.colors.accent} />}
              label={t("wheelForm.weight")}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              editable={!saving}
              placeholder={t("wheelForm.placeholderWeight")}
            />
            <CardRow>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.isCurrentlyFitted")}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <FormSwitch
                  value={isCurrentlyFitted}
                  onValueChange={setIsCurrentlyFitted}
                  disabled={saving}
                />
              </View>
            </CardRow>
          </Card>
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
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
}
