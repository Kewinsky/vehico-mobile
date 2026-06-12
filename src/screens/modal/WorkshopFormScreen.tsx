import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
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
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";

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
      Alert.alert(t("common.error"), e?.message ?? t("common.error"));
    }
  }, [workshopId, t]);

  useScreenFocusReload({
    initialLoad: load,
    onFocusReload: workshopId ? load : undefined,
  });

  const canSave = useMemo(() => {
    return name.trim().length > 0 && workshopType != null;
  }, [name, workshopType]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

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
            Alert.alert(t("common.error"), e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  function clearForm() {
    resetFieldErrors();
    setName("");
    setWorkshopType(null);
    setPhoneNumber("");
    setAddress("");
  }

  async function onSave() {
    if (!validateBeforeSave()) return;
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
            getPremiumUpgradeAlertButtons(t, navigation),
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
      if (handleAndShowLimitErrorAlert(e, t, navigation)) return;
      Alert.alert(t("common.error"), e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={
        workshopId ? t("workshopForm.editTitle") : t("workshopForm.addTitle")
      }
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving,
        loading: saving,
      }}
      footer={
        workshopId ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Button variant="destructive" onPress={confirmDelete}>
              {t("common.delete")}
            </Button>
          </View>
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
              icon="business-outline"
              label={t("workshopForm.name")}
              value={name}
              onChangeText={setName}
              editable={!saving}
              placeholder={t("workshopForm.placeholderName")}
              error={fieldError(!name.trim())}
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
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow error={fieldError(!workshopType)}>
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
                      color: workshopType
                        ? theme.colors.fg
                        : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {workshopType
                    ? t(`workshopForm.types.${workshopType}`)
                    : t("workshopForm.selectType")}
                </Text>
              </CardRow>
            </Pressable>
            <FormInputRow
              icon="call-outline"
              label={t("workshopForm.phoneNumber")}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!saving}
              placeholder={t("workshopForm.placeholderPhone")}
            />
            <FormInputRow
              icon="location-outline"
              label={t("workshopForm.address")}
              value={address}
              onChangeText={setAddress}
              editable={!saving}
              placeholder={t("workshopForm.placeholderAddress")}
            />
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
      marginVertical: theme.spacing.md,
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
