import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type {
  Vehicle,
  VehicleType,
  FuelType,
  TransmissionType,
  DriveType,
} from "../types/domain";
import { getVehicle, updateVehicle } from "../services/vehicles/vehiclesRepo";
import {
  deleteVehiclePhoto,
  uploadVehiclePhoto,
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import type { VehiclePhoto } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicleEdit">;

export function ManageVehicleEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [type, setType] = useState<VehicleType>("car");
  const [title, setTitle] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [transmission, setTransmission] = useState<TransmissionType | null>(
    null
  );
  const [driveType, setDriveType] = useState<DriveType | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      setType(v.type);
      setTitle(v.title);
      setVin(v.vin ?? "");
      setMake(v.make);
      setModel(v.model);
      setYear(String(v.production_year));
      setEngineCapacity(v.engine_capacity ? String(v.engine_capacity) : "");
      setPowerHp(v.power_hp ? String(v.power_hp) : "");
      setFuelType(v.fuel_type);
      setTransmission(v.transmission);
      setDriveType(v.drive_type);
      setNotes(v.notes ?? "");

      // Load photos
      const photosList = await listVehiclePhotos(vehicleId);
      setPhotos(photosList);
      const urls = await Promise.all(
        photosList.map(async (photo) => {
          try {
            return await getVehiclePhotoUrl(photo);
          } catch (error) {
            console.error(
              `Failed to get URL for photo ${photo.id}:`,
              error
            );
            return null;
          }
        })
      );
      const validUrls = urls.filter((url): url is string => url !== null);
      setPhotoUrls(validUrls);
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
        type,
        title: title.trim(),
        vin: vin.trim().length ? vin.trim() : null,
        make: make.trim(),
        model: model.trim(),
        production_year,
        engine_capacity: engineCapacity.trim().length
          ? Number(engineCapacity)
          : null,
        power_hp: powerHp.trim().length ? Number(powerHp) : null,
        fuel_type: fuelType,
        transmission: transmission,
        drive_type: driveType,
        notes: notes.trim().length ? notes.trim() : null,
      });
      setVehicle(updated);
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function pickSource() {
    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      toastError(t("common.error"), t("vehicleForm.maxPhotosReached"));
      return;
    }
    Alert.alert(
      t("attachments.addPickerTitle"),
      t("attachments.addPickerBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("attachments.camera"),
          onPress: () => void pickFromCamera(),
        },
        {
          text: t("attachments.photos"),
          onPress: () => void pickFromGallery(),
        },
        {
          text: t("attachments.files"),
          onPress: () => void pickFromFiles(),
        },
      ]
    );
  }

  async function pickFromCamera() {
    try {
      const remainingSlots = 5 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("common.error"), t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      
      await uploadVehiclePhoto({
        vehicleId,
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      });
      await load();
      toastSuccess(t("manageVehicle.photoAdded"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots = 5 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("common.error"), t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error(t("attachments.galleryPermissionDenied"));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });
      if (result.canceled) return;
      if (!result.assets || result.assets.length === 0) {
        throw new Error(t("attachments.noFileSelected"));
      }

      // Upload all selected photos
      const uploadPromises = result.assets
        .slice(0, remainingSlots)
        .map((asset) =>
          uploadVehiclePhoto({
            vehicleId,
            fileUri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          })
        )
        .filter((promise): promise is Promise<VehiclePhoto> => !!promise);
      await Promise.all(uploadPromises);
      await load();
      toastSuccess(t("manageVehicle.photoAdded"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots = 5 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("common.error"), t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: remainingSlots > 1,
      });
      if (result.canceled) return;
      if (!result.assets || result.assets.length === 0) {
        throw new Error(t("attachments.noFileSelected"));
      }

      // Upload all selected files
      const uploadPromises = result.assets
        .slice(0, remainingSlots)
        .map((asset) =>
          uploadVehiclePhoto({
            vehicleId,
            fileUri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.name ?? null,
          })
        )
        .filter((promise): promise is Promise<VehiclePhoto> => !!promise);
      await Promise.all(uploadPromises);
      await load();
      toastSuccess(t("manageVehicle.photoAdded"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(photo: VehiclePhoto) {
    try {
      await deleteVehiclePhoto(photo);
      await load();
      toastSuccess(t("manageVehicle.photoRemoved"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
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
                if (canSave && !saving) {
                  void onSave();
                }
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

      <Text style={styles.h1}>{t("manageVehicle.editTitle")}</Text>
      {!!loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />

          {/* Photos Section */}
          <View style={styles.photosSection}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.photos")} ({photos.length}/5)
            </Text>
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => {
                const url = photoUrls[index];
                if (!url) return null;
                return (
                  <View key={photo.id} style={styles.photoCard}>
                    <View style={styles.photoImageContainer}>
                      <Image
                        source={{ uri: url }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.photoDeleteButton}>
                        <IconButton
                          onPress={() => {
                            Alert.alert(
                              t("manageVehicle.photoTitle"),
                              t("manageVehicle.removePhotoConfirm"),
                              [
                                { text: t("common.cancel"), style: "cancel" },
                                {
                                  text: t("manageVehicle.removePhoto"),
                                  style: "destructive",
                                  onPress: () =>
                                    void removePhoto(photo),
                                },
                              ]
                            );
                          }}
                          variant="ghost"
                          disabled={saving || uploadingPhoto}
                        >
                          <Ionicons
                            name="close"
                            size={18}
                            color={theme.colors.fg}
                          />
                        </IconButton>
                      </View>
                    </View>
                  </View>
                );
              })}
              {photos.length < 5 && (
                <Button
                  onPress={pickSource}
                  disabled={saving || uploadingPhoto}
                  variant="ghost"
                >
                  {t("vehicleForm.addPhoto")}
                </Button>
              )}
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />
          <View style={styles.group}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.type")}
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setType("car")}
                style={[
                  styles.typeChip,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  type === "car" && { borderColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        type === "car" ? theme.colors.fg : theme.colors.muted,
                    },
                  ]}
                >
                  {t("vehicleForm.car")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType("motorcycle")}
                style={[
                  styles.typeChip,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  type === "motorcycle" && { borderColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        type === "motorcycle"
                          ? theme.colors.fg
                          : theme.colors.muted,
                    },
                  ]}
                >
                  {t("vehicleForm.motorcycle")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />
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
          <PickerField
            label={t("vehicleForm.fuelTypeLabel")}
            value={fuelType}
            options={["petrol", "diesel", "hybrid", "electric", "lpg"] as const}
            getLabel={(value) =>
              t(
                `vehicleForm.fuelType${
                  value.charAt(0).toUpperCase() + value.slice(1)
                }` as
                  | "vehicleForm.fuelTypePetrol"
                  | "vehicleForm.fuelTypeDiesel"
                  | "vehicleForm.fuelTypeHybrid"
                  | "vehicleForm.fuelTypeElectric"
                  | "vehicleForm.fuelTypeLpg"
              )
            }
            onChange={setFuelType}
            placeholder={t("vehicleForm.fuelTypeLabel")}
          />
          <TextField
            label={t("vehicleForm.engineCapacityLabel")}
            value={engineCapacity}
            onChangeText={setEngineCapacity}
            keyboardType="number-pad"
          />
          <TextField
            label={t("vehicleForm.powerHpLabel")}
            value={powerHp}
            onChangeText={setPowerHp}
            keyboardType="number-pad"
          />
          <View style={styles.group}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.transmissionLabel")}
            </Text>
            <View style={styles.typeRow}>
              {(["manual", "automatic"] as const).map((tr) => (
                <Pressable
                  key={tr}
                  onPress={() => setTransmission(tr)}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                    transmission === tr && { borderColor: theme.colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      {
                        color:
                          transmission === tr
                            ? theme.colors.fg
                            : theme.colors.muted,
                      },
                    ]}
                  >
                    {t(
                      `vehicleForm.transmission${
                        tr.charAt(0).toUpperCase() + tr.slice(1)
                      }` as
                        | "vehicleForm.transmissionManual"
                        | "vehicleForm.transmissionAutomatic"
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.group}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.driveTypeLabel")}
            </Text>
            <View style={styles.typeRow}>
              {(["FWD", "RWD", "AWD"] as const).map((dt) => (
                <Pressable
                  key={dt}
                  onPress={() => setDriveType(dt)}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                    driveType === dt && { borderColor: theme.colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      {
                        color:
                          driveType === dt ? theme.colors.fg : theme.colors.muted,
                      },
                    ]}
                  >
                    {dt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextField
            label={t("vehicleForm.notesLabel")}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
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
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: { color: theme.colors.fg, fontWeight: "800" },
    cardMeta: { marginTop: 4, color: theme.colors.muted },
    photosSection: {
      gap: 8,
      marginTop: theme.spacing.sm,
      marginBottom: 4,
    },
    photosGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    photoCard: {
      width: "47%",
      aspectRatio: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    photoImageContainer: {
      position: "relative",
      width: "100%",
      height: "100%",
    },
    photoImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.card,
    },
    photoDeleteButton: {
      position: "absolute",
      top: theme.spacing.xs,
      right: theme.spacing.xs,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    group: {
      gap: 8,
      marginTop: theme.spacing.sm,
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
    },
    typeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    typeChip: {
      flex: 1,
      minWidth: 80,
      height: 44,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    typeChipText: {
      fontWeight: "700",
      fontSize: 13,
    },
  });
