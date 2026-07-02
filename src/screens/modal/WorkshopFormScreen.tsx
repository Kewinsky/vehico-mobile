import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { WorkshopType } from "../../types/domain";
import {
  WORKSHOP_TYPE_OPTIONS,
  buildWorkshopPayload,
  canSaveWorkshop,
  workshopFieldErrors,
  type WorkshopFormState,
} from "../../forms/workshopForm";
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
import { Card } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopForm">;

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

  const formValues = useMemo(
    (): WorkshopFormState => ({
      name,
      workshopType,
      phoneNumber,
      address,
    }),
    [name, workshopType, phoneNumber, address],
  );

  const fieldErrors = useMemo(
    () => workshopFieldErrors(formValues),
    [formValues],
  );

  const canSave = useMemo(() => canSaveWorkshop(formValues), [formValues]);

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

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

  useScreenFocusReload({
    initialLoad: load,
    onFocusReload: workshopId ? load : undefined,
  });

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

      const payload = buildWorkshopPayload(formValues);
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
              error={fieldError(fieldErrors.name)}
            />
            <FormPickerRow<WorkshopType>
              icon="pricetag-outline"
              label={t("workshopForm.workshopType")}
              value={workshopType}
              options={WORKSHOP_TYPE_OPTIONS}
              getLabel={(value) => t(`workshopForm.types.${value}`)}
              onChange={setWorkshopType}
              placeholderLabel={t("workshopForm.selectType")}
              disabled={saving}
              error={fieldError(fieldErrors.workshopType)}
            />
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
