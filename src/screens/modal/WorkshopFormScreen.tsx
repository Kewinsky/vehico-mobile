import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { WorkshopType } from "../../types/domain";
import {
  createWorkshop,
  deleteWorkshop,
  getWorkshop,
  updateWorkshop,
  listWorkshops,
} from "../../services/workshops/workshopsRepo";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";
import { maybeHandleBackendEntitlementLimitError } from "../../ui/limits/entitlementAlerts";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopForm">;

const WORKSHOP_TYPES: WorkshopType[] = [
  "mechanic",
  "electrician",
  "detailer",
  "bodywork",
  "car_wash",
  "other",
];

export function WorkshopFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium, workshopsLimit, freePlanWorkshopIds } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { workshopId } = route.params ?? {};
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const [name, setName] = useState("");
  const [workshopType, setWorkshopType] = useState<WorkshopType | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!workshopId) return;
    try {
      const w = await getWorkshop(workshopId);
      setName(w.name);
      setWorkshopType(w.workshop_type);
      setPhoneNumber(w.phone_number ?? "");
      setAddress(w.address ?? "");
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }, [workshopId, t]);

  useEffect(() => {
    void load();
    const unsub = workshopId
      ? navigation.addListener("focus", () => void load())
      : () => {};
    return unsub;
  }, [navigation, load, workshopId]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && workshopType != null;
  }, [name, workshopType]);

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
    if (!workshopId) return;
    Alert.alert(t("workshops.deleteTitle"), t("workshops.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkshop(workshopId);
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
    setWorkshopType(null);
    setPhoneNumber("");
    setAddress("");
  }

  async function onSave() {
    try {
      setSaving(true);
      // Check workshop limit (only for new workshops)
      if (!workshopId && !isPremium) {
        const workshops = await listWorkshops(
          isPremium ? undefined : { freePlanWorkshopIds },
        );
        if (workshops.length >= workshopsLimit) {
          Alert.alert(
            t("limits.workshopLimitReachedTitle"),
            t("limits.workshopLimitReachedBody", { limit: workshopsLimit }),
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
        name: name.trim(),
        workshop_type: workshopType!,
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
      };
      if (workshopId) {
        await updateWorkshop(workshopId, payload);
      } else {
        await createWorkshop(payload);
      }
      navigation.goBack();
    } catch (e: any) {
      if (maybeHandleBackendEntitlementLimitError(e, t, navigation)) return;
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={
        workshopId
          ? t("workshopForm.editTitle")
          : t("workshopForm.addTitle")
      }
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: !canSave || saving,
      }}
      footer={
        workshopId ? (
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
              name="business-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("workshopForm.name")}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!saving}
            placeholder={t("workshopForm.placeholderName")}
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
            showPicker<WorkshopType>({
              title: t("workshopForm.workshopType"),
              value: workshopType,
              options: WORKSHOP_TYPES,
              getLabel: (v) => t(`workshopForm.types.${v}`),
              onChange: setWorkshopType,
              placeholderLabel: t("workshopForm.selectType"),
            })
          }
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
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
              {t("workshopForm.workshopType")}
            </Text>
          </View>
          <Text
            style={[
              styles.valueText,
              {
                color: workshopType ? theme.colors.fg : theme.colors.muted,
                textAlign: "right",
              },
            ]}
            numberOfLines={1}
          >
            {workshopType
              ? t(`workshopForm.types.${workshopType}`)
              : t("workshopForm.selectType")}
          </Text>
        </Pressable>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="call-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("workshopForm.phoneNumber")}
            </Text>
          </View>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!saving}
            placeholder={t("workshopForm.placeholderPhone")}
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
              name="location-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {t("workshopForm.address")}
            </Text>
          </View>
          <TextInput
            value={address}
            onChangeText={setAddress}
            editable={!saving}
            placeholder={t("workshopForm.placeholderAddress")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </View>
      </View>
      </FormScreen>
    </ModalLayout>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    h1: {
      fontSize: theme.typography.largeTitle,
      marginVertical: theme.spacing.md,
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
