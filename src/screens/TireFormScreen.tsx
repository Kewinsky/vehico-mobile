import { useEffect, useMemo, useState } from "react";
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
import type { TireType } from "../types/domain";
import { isPositiveNumber, isValidDot } from "../utils/validation";
import {
  createVehicleTire,
  deleteVehicleTire,
  getVehicleTire,
  updateVehicleTire,
  listVehicleTires,
} from "../services/tires/tiresRepo";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { maybeHandleBackendEntitlementLimitError } from "../ui/limits/entitlementAlerts";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { SunSnowIcon } from "lucide-react-native";

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
  const { isPremium, tiresPerVehicleLimit } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, tireId } = route.params;
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [profile, setProfile] = useState("");
  const [diameter, setDiameter] = useState("");
  const [tireType, setTireType] = useState<TireType | null>(null);
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
    setName("");
    setWidth("");
    setProfile("");
    setDiameter("");
    setTireType(null);
    setDot("");
    setIsCurrentlyFitted(false);
  }

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
      // Check tire limit (only for new tires)
      if (!tireId && !isPremium) {
        const tires = await listVehicleTires(vehicleId, {
          limit: tiresPerVehicleLimit,
        });
        if (tires.length >= tiresPerVehicleLimit) {
          Alert.alert(
            t("limits.tireLimitReachedTitle"),
            t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
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
      if (e?.message === "FITTED_TIRE_LIMIT_REACHED") {
        Alert.alert(
          t("limits.fittedTireLimitReachedTitle"),
          t("limits.fittedTireLimitReachedBody"),
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
      footer={
        tireId ? (
          <Button variant="destructive" onPress={confirmDelete}>
            {t("common.delete")}
          </Button>
        ) : null
      }
    >
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>
        {tireId ? t("tireForm.editTitle") : t("tireForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.md }} />

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
              {t("tireForm.name")}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!saving}
            placeholder={t("tireForm.placeholderName")}
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
              {t("tireForm.width")}
            </Text>
          </View>
          <TextInput
            value={width}
            onChangeText={setWidth}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("tireForm.placeholderWidth")}
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
              name="column-height"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("tireForm.profile")}
            </Text>
          </View>
          <TextInput
            value={profile}
            onChangeText={setProfile}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("tireForm.placeholderProfile")}
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
              {t("tireForm.diameter")}
            </Text>
          </View>
          <TextInput
            value={diameter}
            onChangeText={setDiameter}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("tireForm.placeholderDiameter")}
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
        <Pressable
          onPress={() =>
            showPicker<TireType>({
              title: t("tireForm.tireType"),
              value: tireType,
              options: TIRE_TYPES,
              getLabel: (v) => t(`tireForm.types.${v}`),
              onChange: setTireType,
              placeholderLabel: t("tireForm.placeholderTireType"),
            })
          }
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
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
        </Pressable>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
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
              {t("tireForm.dot")}
            </Text>
          </View>
          <TextInput
            value={dot}
            onChangeText={setDot}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={t("tireForm.placeholderDot")}
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
        </View>
      </View>
      {!tireId ? (
        <>
          <View style={{ height: theme.spacing.sm }} />
          <Button variant="outlined" onPress={clearForm} disabled={saving}>
            {t("common.clearButton")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
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
      fontWeight: "600",
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
  });
}
