import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle, VehiclePhoto } from "../types/domain";
import { getVehicle, updateVehicle } from "../services/vehicles/vehiclesRepo";
import { createSignedUrl } from "../services/attachments/attachmentsRepo";
import {
  deleteVehiclePhoto,
  listVehiclePhotos,
  uploadVehiclePhoto,
} from "../services/vehiclePhotos/vehiclePhotosRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicleEdit">;

export function ManageVehicleEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const p = await listVehiclePhotos(vehicleId);
      setPhotos(p);
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

  async function addPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Media library permission denied");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) throw new Error("No file selected");
      await uploadVehiclePhoto({ vehicleId, fileUri: uri });
      const p = await listVehiclePhotos(vehicleId);
      setPhotos(p);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  async function openPhoto(photo: VehiclePhoto) {
    try {
      const url = await createSignedUrl(
        photo.storage_bucket,
        photo.storage_path
      );
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  async function removePhoto(photo: VehiclePhoto) {
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
              await deleteVehiclePhoto(photo);
              setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
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
        <Text style={styles.muted}>{t("manageVehicle.loading")}</Text>
      )}

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />
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

          <View style={{ height: 24 }} />
          <View style={styles.sectionHeader}>
            <Text style={styles.h2}>{t("manageVehicle.photosTitle")}</Text>
            <Text style={styles.muted}>
              {t("manageVehicle.photosSubtitle")}
            </Text>
          </View>
          <View style={{ height: 10 }} />
          <Button
            onPress={() => void addPhoto()}
            variant="ghost"
            disabled={saving}
          >
            {t("manageVehicle.addPhoto")}
          </Button>
          <View style={{ height: 10 }} />
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => void openPhoto(item)}
                  >
                    <Text style={styles.cardTitle}>
                      {t("documents.photoLabel")}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.storage_path.split("/").slice(-1)[0]}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void removePhoto(item)}
                    hitSlop={10}
                    style={styles.trash}
                  >
                    <Text style={styles.trashText}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              loading ? (
                <Text style={styles.muted}>{t("common.loading")}</Text>
              ) : (
                <Text style={styles.muted}>{t("documents.noPhotos")}</Text>
              )
            }
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
    h1: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
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
    trash: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    trashText: { color: theme.colors.danger, fontWeight: "900" },
  });
