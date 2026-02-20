import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { AntDesign, Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { isPositiveNumber, isValidEt, parseDecimal } from "../utils/validation";
import {
  createVehicleWheel,
  deleteVehicleWheel,
  getVehicleWheel,
  updateVehicleWheel,
  listVehicleWheels,
} from "../services/wheels/wheelsRepo";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { ModalButton } from "../ui/components/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { maybeHandleBackendEntitlementLimitError } from "../ui/limits/entitlementAlerts";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { BoltPatternIcon } from "../ui/components/BoltPatternIcon";
import { BoltTypeIcon } from "../ui/components/BoltTypeIcon";

type Props = NativeStackScreenProps<AppStackParamList, "WheelForm">;

export function WheelFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    isPremium,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanWheelId,
  } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, wheelId } = route.params;
  const wheelOptions = isPremium
    ? undefined
    : freePlanVehicleId === vehicleId
      ? { freePlanWheelId: freePlanWheelId ?? null }
      : { limit: wheelsPerVehicleLimit };
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

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
            navigation.goBack();
          } catch (e: any) {
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  function clearForm() {
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
      // Check wheel limit (only for new wheels)
      if (!wheelId && !isPremium) {
        const wheels = await listVehicleWheels(vehicleId, wheelOptions);
        if (wheels.length >= wheelsPerVehicleLimit) {
          Alert.alert(
            t("limits.wheelLimitReachedTitle"),
            t("limits.wheelLimitReachedBody", { limit: wheelsPerVehicleLimit }),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("limits.upgradeToPremium"),
                onPress: () => navigation.navigate("Shop"),
              },
            ],
          );
          return;
        }
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
      if (e?.message === "FITTED_WHEEL_LIMIT_REACHED") {
        Alert.alert(
          t("limits.fittedWheelLimitReachedTitle"),
          t("limits.fittedWheelLimitReachedBody"),
        );
      } else if (maybeHandleBackendEntitlementLimitError(e, t, navigation)) {
        return;
      } else {
        toastError(e?.message ?? t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: wheelId ? t("wheelForm.editTitle") : t("wheelForm.addTitle"),
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
  }, [navigation, t, theme.colors.bg, theme.colors.fg, wheelId, canSave, saving, onSave]);

  return (
    <FormScreen
      isModal
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
              name="pricetag-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.name")}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!saving}
            placeholder={t("wheelForm.placeholderName")}
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
              name="resize-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.width")}
            </Text>
          </View>
          <TextInput
            value={width}
            onChangeText={setWidth}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("wheelForm.placeholderWidth")}
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
              name="ellipse-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.diameter")}
            </Text>
          </View>
          <TextInput
            value={diameter}
            onChangeText={setDiameter}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("wheelForm.placeholderDiameter")}
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
            <AntDesign
              name="column-width"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.etOffset")}
            </Text>
          </View>
          <TextInput
            value={etOffset}
            onChangeText={setEtOffset}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("wheelForm.placeholderEtOffset")}
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
            <BoltPatternIcon size={20} color={theme.colors.accent} />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.boltPattern")}
            </Text>
          </View>
          <TextInput
            value={boltPattern}
            onChangeText={setBoltPattern}
            editable={!saving}
            placeholder={t("wheelForm.placeholderBoltPattern")}
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
              name="radio-button-on-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.centerBore")}
            </Text>
          </View>
          <TextInput
            value={centerBore}
            onChangeText={setCenterBore}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("wheelForm.placeholderCenterBore")}
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
            <BoltTypeIcon size={20} color={theme.colors.accent} />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.boltType")}
            </Text>
          </View>
          <TextInput
            value={boltType}
            onChangeText={setBoltType}
            editable={!saving}
            placeholder={t("wheelForm.placeholderBoltType")}
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
              name="barbell-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("wheelForm.weight")}
            </Text>
          </View>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder={t("wheelForm.placeholderWeight")}
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
              name="checkmark-circle-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("wheelForm.isCurrentlyFitted")}
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
        </View>
      </View>
    </FormScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    card: { borderWidth: 1, borderRadius: theme.radius.md, overflow: "hidden" },
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
  });
}
