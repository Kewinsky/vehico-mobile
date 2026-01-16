import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { getVehicle, updateVehicle } from "../services/vehicles/vehiclesRepo";
import {
  deleteVehicleProfilePhoto,
  uploadVehicleProfilePhoto,
} from "../services/vehicles/uploadProfilePhoto";
import { createSignedUrl } from "../services/attachments/attachmentsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicleEdit">;

export function ManageVehicleEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [title, setTitle] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      setTitle(v.title);
      setVin(v.vin ?? "");
      setMake(v.make);
      setModel(v.model);
      setYear(String(v.production_year));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      make.trim().length > 0 &&
      model.trim().length > 0 &&
      year.trim().length === 4
    );
  }, [title, make, model, year]);

  async function onSave() {
    try {
      setSaving(true);
      const production_year = Number(year);
      if (!Number.isFinite(production_year)) throw new Error("Invalid year");
      const updated = await updateVehicle(vehicleId, {
        title: title.trim(),
        vin: vin.trim().length ? vin.trim() : null,
        make: make.trim(),
        model: model.trim(),
        production_year,
      });
      setVehicle(updated);
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function pickProfilePhoto() {
    try {
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Media library permission denied");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) throw new Error("No file selected");
      
      const photoUrl = await uploadVehicleProfilePhoto({ vehicleId, fileUri: uri });
      await updateVehicle(vehicleId, { profile_photo_url: photoUrl });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProfilePhoto() {
    Alert.alert(
      t("manageVehicle.removePhotoTitle"),
      t("manageVehicle.removePhotoBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleProfilePhoto(vehicleId);
              await updateVehicle(vehicleId, { profile_photo_url: null });
              await load();
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }


  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("manageVehicle.editTitle")}</Text>
      {!!loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />
          
          {/* Profile Photo Section */}
          {vehicle.profile_photo_url ? (
            <View style={styles.profilePhotoCard}>
              <View style={styles.profilePhotoImageContainer}>
                <Image
                  source={{ uri: vehicle.profile_photo_url }}
                  style={styles.profilePhotoImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.profilePhotoMenuButton}>
                  <IconButton
                    onPress={() => {
                      Alert.alert(
                        t("manageVehicle.profilePhotoTitle"),
                        "",
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("manageVehicle.changeProfilePhoto"),
                            onPress: () => void pickProfilePhoto(),
                          },
                          {
                            text: t("manageVehicle.removeProfilePhoto"),
                            style: "destructive",
                            onPress: () => void removeProfilePhoto(),
                          },
                        ]
                      );
                    }}
                    variant="ghost"
                    disabled={saving || uploadingPhoto}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={theme.colors.fg}
                    />
                  </IconButton>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.profilePhotoCard}>
              <Button
                onPress={() => void pickProfilePhoto()}
                variant="ghost"
                disabled={saving || uploadingPhoto}
              >
                {t("manageVehicle.addProfilePhoto")}
              </Button>
            </View>
          )}

          <View style={{ height: 24 }} />
          <TextField
            noMarginTop
            label={t("manageVehicle.titleLabel")}
            value={title}
            onChangeText={setTitle}
          />
          <TextField
            label={t("manageVehicle.vinLabel")}
            value={vin}
            onChangeText={setVin}
            autoCapitalize="characters"
          />
          <TextField
            label={t("manageVehicle.makeLabel")}
            value={make}
            onChangeText={setMake}
          />
          <TextField
            label={t("manageVehicle.modelLabel")}
            value={model}
            onChangeText={setModel}
          />
          <TextField
            label={t("manageVehicle.yearLabel")}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />

          <View style={{ height: 16 }} />
          <Button onPress={onSave} disabled={!canSave || saving}>
            {t("common.save")}
          </Button>
          <View style={{ height: 10 }} />
          <Button
            onPress={() => navigation.goBack()}
            variant="ghost"
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    h2: { fontSize: 16, fontWeight: "800", color: theme.colors.fg },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    sectionHeader: { gap: 6 },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    cardTitle: { color: theme.colors.fg, fontWeight: "800" },
    cardMeta: { marginTop: 4, color: theme.colors.muted },
    profilePhotoCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    profilePhotoImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
    },
    profilePhotoImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.card,
    },
    profilePhotoMenuButton: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
    },
    loadingContainer: {
      paddingTop: 40,
      paddingBottom: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });
