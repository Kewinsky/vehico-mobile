import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { TireType } from "../../types/domain";
import {
  TIRE_DIAMETER_MAX_LENGTH,
  TIRE_DOT_MAX_LENGTH,
  TIRE_PROFILE_MAX_LENGTH,
  TIRE_TYPE_OPTIONS,
  TIRE_WIDTH_MAX_LENGTH,
  buildTirePayload,
  canSaveTire,
  sanitizeTireDigits,
  tireFieldErrors,
  type TireFormState,
} from "../../forms/tireForm";
import {
  createVehicleTire,
  deleteVehicleTire,
  getVehicleTire,
  updateVehicleTire,
  listVehicleTires,
} from "../../services/tires/tiresRepo";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useTheme } from "../../ui/ThemeProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";
import { SunSnowIcon } from "lucide-react-native";

type Props = NativeStackScreenProps<AppStackParamList, "TireForm">;

export function TireFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium, tiresPerVehicleLimit, freePlanVehicleId, freePlanTireId } =
    useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, tireId } = route.params;
  const tireOptions = isPremium
    ? undefined
    : freePlanVehicleId === vehicleId
      ? { freePlanTireId: freePlanTireId ?? null }
      : { limit: tiresPerVehicleLimit };

  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [profile, setProfile] = useState("");
  const [diameter, setDiameter] = useState("");
  const [tireType, setTireType] = useState<TireType | null>(null);
  const [dot, setDot] = useState("");
  const [isCurrentlyFitted, setIsCurrentlyFitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const formValues = useMemo(
    (): TireFormState => ({
      name,
      width,
      profile,
      diameter,
      tireType,
      dot,
      isCurrentlyFitted,
    }),
    [name, width, profile, diameter, tireType, dot, isCurrentlyFitted],
  );

  const fieldErrors = useMemo(() => tireFieldErrors(formValues), [formValues]);

  const canSave = useMemo(() => canSaveTire(formValues), [formValues]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

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

    Alert.alert(opts.title, t("common.chooseOption"), buttons, {
      cancelable: true,
    });
  }

  function confirmDelete() {
    if (!tireId) return;
    Alert.alert(t("wheels.deleteTireTitle"), t("wheels.deleteTireBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVehicleTire(tireId);
            navigation.goBack();
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
    setProfile("");
    setDiameter("");
    setTireType(null);
    setDot("");
    setIsCurrentlyFitted(false);
  }

  async function onSave() {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
      if (!tireId && !isPremium) {
        const tires = await listVehicleTires(vehicleId, tireOptions);
        if (tires.length >= tiresPerVehicleLimit) {
          Alert.alert(
            t("limits.tireLimitReachedTitle"),
            t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
            getPremiumUpgradeAlertButtons(t, navigation),
          );
          return;
        }
      }

      const payload = buildTirePayload(vehicleId, formValues);
      if (tireId) {
        await updateVehicleTire(tireId, payload);
      } else {
        await createVehicleTire(payload);
      }
      navigation.goBack();
    } catch (e: any) {
      if (e?.message === "FITTED_TIRE_LIMIT_REACHED") {
        Alert.alert(
          t("limits.fittedTireLimitReachedTitle"),
          t("limits.fittedTireLimitReachedBody"),
        );
      } else if (handleAndShowLimitErrorAlert(e, t, navigation)) {
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
      title={tireId ? t("tireForm.editTitle") : t("tireForm.addTitle")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving,
        loading: saving,
      }}
      footer={
        tireId ? (
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
              label={t("tireForm.name")}
              value={name}
              onChangeText={setName}
              editable={!saving}
              placeholder={t("tireForm.placeholderName")}
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
              label={t("tireForm.width")}
              value={width}
              onChangeText={(text) =>
                setWidth(sanitizeTireDigits(text, TIRE_WIDTH_MAX_LENGTH))
              }
              keyboardType="number-pad"
              maxLength={TIRE_WIDTH_MAX_LENGTH}
              editable={!saving}
              placeholder={t("tireForm.placeholderWidth")}
              error={fieldError(fieldErrors.width)}
            />
            <FormInputRow
              iconComponent={
                <AntDesign
                  name="column-height"
                  size={20}
                  color={theme.colors.accent}
                />
              }
              label={t("tireForm.profile")}
              value={profile}
              onChangeText={(text) =>
                setProfile(sanitizeTireDigits(text, TIRE_PROFILE_MAX_LENGTH))
              }
              keyboardType="number-pad"
              maxLength={TIRE_PROFILE_MAX_LENGTH}
              editable={!saving}
              placeholder={t("tireForm.placeholderProfile")}
              error={fieldError(fieldErrors.profile)}
            />
            <FormInputRow
              iconComponent={
                <MaterialCommunityIcons
                  name="diameter-variant"
                  size={20}
                  color={theme.colors.accent}
                />
              }
              label={t("tireForm.diameter")}
              value={diameter}
              onChangeText={(text) =>
                setDiameter(sanitizeTireDigits(text, TIRE_DIAMETER_MAX_LENGTH))
              }
              keyboardType="number-pad"
              maxLength={TIRE_DIAMETER_MAX_LENGTH}
              editable={!saving}
              placeholder={t("tireForm.placeholderDiameter")}
              error={fieldError(fieldErrors.diameter)}
            />
            <Pressable
              onPress={() =>
                showPicker<TireType>({
                  title: t("tireForm.tireType"),
                  value: tireType,
                  options: TIRE_TYPE_OPTIONS,
                  getLabel: (v) => t(`tireForm.types.${v}`),
                  onChange: setTireType,
                  placeholderLabel: t("tireForm.placeholderTireType"),
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow error={fieldError(fieldErrors.tireType)}>
                <View style={styles.rowLeft}>
                  <SunSnowIcon size={20} color={theme.colors.accent} />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("tireForm.tireType")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: tireType ? theme.colors.fg : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tireType
                    ? t(`tireForm.types.${tireType}`)
                    : t("tireForm.placeholderTireType")}
                </Text>
              </CardRow>
            </Pressable>
            <FormInputRow
              icon="calendar-outline"
              label={t("tireForm.dot")}
              value={dot}
              onChangeText={(text) =>
                setDot(sanitizeTireDigits(text, TIRE_DOT_MAX_LENGTH))
              }
              keyboardType="number-pad"
              maxLength={TIRE_DOT_MAX_LENGTH}
              editable={!saving}
              placeholder={t("tireForm.placeholderDot")}
              error={fieldError(fieldErrors.dot)}
            />
            <CardRow>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("tireForm.isCurrentlyFitted")}
                </Text>
              </View>
              <View style={styles.rowRight}>
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
