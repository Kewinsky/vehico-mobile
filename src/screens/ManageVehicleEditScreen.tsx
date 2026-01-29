import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { DraggableGrid } from "react-native-draggable-grid";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  isValidProductionYear,
  isNonNegativeNumber,
} from "../utils/validation";
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
  reorderVehiclePhotos,
} from "../services/vehicles/uploadPhoto";
import type { VehiclePhoto } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

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
  const [isDragging, setIsDragging] = useState(false);

  const [type, setType] = useState<VehicleType>("car");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [transmission, setTransmission] = useState<TransmissionType | null>(
    null,
  );
  const [driveType, setDriveType] = useState<DriveType | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      setType(v.type);
      setVin(v.vin ?? "");
      setMake(v.make);
      setModel(v.model);
      setYear(String(v.production_year));
      setMileage(v.mileage ? String(v.mileage) : "");
      setEngineCapacity(v.engine_capacity ? String(v.engine_capacity) : "");
      setPowerHp(v.power_hp ? String(v.power_hp) : "");
      setFuelType(v.fuel_type);
      setTransmission(v.transmission);
      setDriveType(v.drive_type);
      setNotes(v.notes ?? "");

      // Load photos
      const photosList = await listVehiclePhotos(vehicleId);
      setPhotos(photosList);
      const urls = photosList.map((photo) => getVehiclePhotoUrl(photo));
      setPhotoUrls(urls);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSave = useMemo(() => {
    return (
      make.trim().length > 0 &&
      model.trim().length > 0 &&
      isValidProductionYear(year) &&
      isNonNegativeNumber(mileage) &&
      isNonNegativeNumber(engineCapacity) &&
      isNonNegativeNumber(powerHp)
    );
  }, [make, model, year, mileage, engineCapacity, powerHp]);

  async function onSave() {
    try {
      setSaving(true);
      if (!isValidProductionYear(year)) {
        toastError(
          t("validation.invalidYear", { max: new Date().getFullYear() + 2 }),
        );
        return;
      }
      if (mileage.trim() && !isNonNegativeNumber(mileage)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
      if (engineCapacity.trim() && !isNonNegativeNumber(engineCapacity)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
      if (powerHp.trim() && !isNonNegativeNumber(powerHp)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
      const production_year = Number(year.trim());
      const updated = await updateVehicle(vehicleId, {
        type,
        vin: vin.trim().length ? vin.trim() : null,
        make: make.trim(),
        model: model.trim(),
        production_year,
        mileage: mileage.trim().length ? Number(mileage) : null,
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
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  function pickSource() {
    const remainingSlots = 6 - photos.length;
    if (remainingSlots <= 0) {
      toastError(t("vehicleForm.maxPhotosReached"));
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
      ],
    );
  }

  async function pickFromCamera() {
    try {
      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
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
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.galleryPermissionDenied"));
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
          }),
        )
        .filter((promise): promise is Promise<VehiclePhoto> => !!promise);
      await Promise.all(uploadPromises);
      await load();
      toastSuccess(t("manageVehicle.photoAdded"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0) {
        toastError(t("vehicleForm.maxPhotosReached"));
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
          }),
        )
        .filter((promise): promise is Promise<VehiclePhoto> => !!promise);
      await Promise.all(uploadPromises);
      await load();
      toastSuccess(t("manageVehicle.photoAdded"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
    }
  }

  type PhotoItem = {
    key: string;
    photoId: string;
    url: string;
    index: number;
  };

  const photoItems: PhotoItem[] = useMemo(() => {
    return photos
      .map((photo, index) => ({
        key: photo.id,
        photoId: photo.id,
        url: photoUrls[index] || "",
        index,
      }))
      .filter((item) => item.url);
  }, [photos, photoUrls]);

  const renderPhotoItem = (item: PhotoItem) => {
    const photo = photos.find((p) => p.id === item.photoId);
    if (!photo) {
      // Return empty view if photo not found
      return <View style={styles.photoCard} />;
    }

    const currentIndex = photos.findIndex((p) => p.id === item.photoId);
    const isMain = currentIndex === 0;
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoImageContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.photoImage}
            contentFit="cover"
            transition={200}
          />
          {isMain && (
            <View style={styles.photoMainBadge}>
              <Text style={styles.photoMainText}>
                {t("manageVehicle.mainPhoto")}
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => void removePhoto(photo)}
            disabled={saving || uploadingPhoto}
            style={styles.photoDeleteButton}
            hitSlop={5}
          >
            <Ionicons name="close" size={16} color={theme.colors.fg} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <FormScreen
      scrollEnabled={!isDragging}
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
          <LoadingIndicator />
        </View>
      )}

      {vehicle ? (
        <>
          {/* Photos Section */}
          <View style={styles.photosSection}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.photos")} ({photos.length}/6)
            </Text>
            {photoItems.length > 0 ? (
              <DraggableGrid
                numColumns={3}
                renderItem={renderPhotoItem}
                data={photoItems}
                onDragStart={() => {
                  setIsDragging(true);
                }}
                onDragRelease={(data) => {
                  setIsDragging(false);
                  // Map back to photos in new order based on photoId
                  const newPhotos: VehiclePhoto[] = data
                    .map((item) => photos.find((p) => p.id === item.photoId))
                    .filter((p): p is VehiclePhoto => !!p);

                  // Update photos state immediately
                  setPhotos(newPhotos);

                  // Update photoUrls in the same order (use existing URLs, just reorder)
                  const newPhotoUrls = newPhotos
                    .map((photo) => {
                      const oldIndex = photos.findIndex(
                        (p) => p.id === photo.id,
                      );
                      return photoUrls[oldIndex] || "";
                    })
                    .filter((url) => url !== "");
                  setPhotoUrls(newPhotoUrls);

                  // Update display_order in database (async, don't wait)
                  void reorderVehiclePhotos(
                    vehicleId,
                    newPhotos.map((p) => p.id),
                  );
                }}
              />
            ) : null}
            {photos.length < 6 && (
              <View style={styles.addPhotoButtonContainer}>
                <Button
                  onPress={pickSource}
                  disabled={saving || uploadingPhoto}
                  variant="ghost"
                >
                  {t("vehicleForm.addPhoto")}
                </Button>
              </View>
            )}
          </View>

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
            label={t("manageVehicle.vinLabel")}
            value={vin}
            onChangeText={setVin}
            autoCapitalize="characters"
          />
          <TextField
            label={`${t("manageVehicle.makeLabel")} *`}
            value={make}
            onChangeText={setMake}
          />
          <TextField
            label={`${t("manageVehicle.modelLabel")} *`}
            value={model}
            onChangeText={setModel}
          />
          <TextField
            label={`${t("manageVehicle.yearLabel")} *`}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TextField
            label={t("vehicleForm.mileageLabel")}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="number-pad"
            placeholder={t("vehicleForm.placeholderMileage")}
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
                  | "vehicleForm.fuelTypeLpg",
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
                        | "vehicleForm.transmissionAutomatic",
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
                          driveType === dt
                            ? theme.colors.fg
                            : theme.colors.muted,
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
      width:
        (Dimensions.get("window").width -
          theme.spacing.md * 2 -
          theme.spacing.sm * 2) /
        3,
      aspectRatio: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addPhotoButtonContainer: {
      marginTop: theme.spacing.sm,
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
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bg,
      borderRadius: 14,
      opacity: 0.7,
    },
    photoMainBadge: {
      position: "absolute",
      top: theme.spacing.xs,
      left: theme.spacing.xs,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    photoMainText: {
      color: "#000000",
      fontSize: 11,
      fontWeight: "700",
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
