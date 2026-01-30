import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { WorkshopType } from "../types/domain";
import {
  createWorkshop,
  getWorkshop,
  updateWorkshop,
} from "../services/workshops/workshopsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { workshopId } = route.params ?? {};

  const [name, setName] = useState("");
  const [workshopType, setWorkshopType] = useState<WorkshopType | null>(
    "mechanic",
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workshopId) return;
    void (async () => {
      try {
        const w = await getWorkshop(workshopId);
        setName(w.name);
        setWorkshopType(w.workshop_type);
        setPhoneNumber(w.phone_number ?? "");
        setAddress(w.address ?? "");
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      }
    })();
  }, [workshopId, t]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && workshopType != null;
  }, [name, workshopType]);

  async function onSave() {
    try {
      setSaving(true);
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
        {workshopId ? t("workshopForm.editTitle") : t("workshopForm.addTitle")}
      </Text>

      <View style={{ height: theme.spacing.lg }} />

      <TextField
        noMarginTop
        label={`${t("workshopForm.name")} *`}
        value={name}
        onChangeText={setName}
        placeholder={t("workshopForm.placeholderName")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <PickerField<WorkshopType>
        noMarginTop
        label={`${t("workshopForm.workshopType")} *`}
        value={workshopType}
        options={WORKSHOP_TYPES}
        getLabel={(v) => t(`workshopForm.types.${v}`)}
        onChange={setWorkshopType}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("workshopForm.phoneNumber")}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder={t("workshopForm.placeholderPhone")}
      />
      <View style={{ height: theme.spacing.sm }} />
      <TextField
        noMarginTop
        label={t("workshopForm.address")}
        value={address}
        onChangeText={setAddress}
        placeholder={t("workshopForm.placeholderAddress")}
      />
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
  });
}
