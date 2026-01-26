import { useMemo, useState } from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { DraggableGrid } from "react-native-draggable-grid";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleType, FuelType, TransmissionType, DriveType } from "../types/domain";
import { createVehicle } from "../services/vehicles/vehiclesRepo";
import { uploadVehiclePhoto } from "../services/vehicles/uploadPhoto";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleForm">;

export function VehicleFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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
    null
  );
  const [driveType, setDriveType] = useState<DriveType | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  type PhotoFile = {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  };
  const [photoUris, setPhotoUris] = useState<PhotoFile[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canSave = useMemo(() => {
    return (
      make.trim().length > 0 &&
      model.trim().length > 0 &&
      year.trim().length === 4
    );
  }, [make, model, year]);

  function pickSource() {
    const remainingSlots = 6 - photoUris.length;
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
      ]
    );
  }

  async function pickFromCamera() {
    try {
      const remainingSlots = 6 - photoUris.length;
      if (remainingSlots <= 0) {
        toastError(t("vehicleForm.maxPhotosReached"));
        return;
      }
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      setPhotoUris([
        ...photoUris,
        {
          uri: asset.uri,
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
        },
      ]);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots = 6 - photoUris.length;
      if (remainingSlots <= 0) {
        toastError(t("vehicleForm.maxPhotosReached"));
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
      // Add all selected photos, but limit to remaining slots
      const newPhotos = result.assets
        .slice(0, remainingSlots)
        .map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
        }))
        .filter((photo) => !!photo.uri) as PhotoFile[];
      setPhotoUris([...photoUris, ...newPhotos]);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots = 6 - photoUris.length;
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
      // Add all selected files, but limit to remaining slots
      const newPhotos = result.assets
        .slice(0, remainingSlots)
        .map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType ?? null,
          fileName: asset.name ?? null,
        }))
        .filter((photo) => !!photo.uri) as PhotoFile[];
      setPhotoUris([...photoUris, ...newPhotos]);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(index: number) {
    setPhotoUris(photoUris.filter((_, i) => i !== index));
  }

  type PhotoItem = {
    key: string;
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    index: number;
  };

  const photoItems: PhotoItem[] = useMemo(() => {
    return photoUris.map((photo, index) => ({
      key: photo.uri, // Use URI as unique key
      uri: photo.uri,
      mimeType: photo.mimeType,
      fileName: photo.fileName,
      index,
    }));
  }, [photoUris]);

  const renderPhotoItem = (item: PhotoItem) => {
    const currentIndex = photoUris.findIndex((p) => p.uri === item.uri);
    const isMain = currentIndex === 0;
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoImageContainer}>
          <Image
            source={{ uri: item.uri }}
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
            onPress={() => removePhoto(currentIndex >= 0 ? currentIndex : item.index)}
            disabled={saving || uploadingPhoto}
            style={styles.photoDeleteButton}
            hitSlop={5}
          >
              <Ionicons
                name="close"
                size={16}
                color={theme.colors.fg}
              />
          </Pressable>
        </View>
      </View>
    );
  };

  async function onSave() {
    try {
      setSaving(true);
      const production_year = Number(year);
      if (!Number.isFinite(production_year)) throw new Error("Invalid year");

      const created = await createVehicle({
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

      // Upload photos if selected
      if (photoUris.length > 0) {
        try {
          for (const photo of photoUris) {
            await uploadVehiclePhoto({
              vehicleId: created.id,
              fileUri: photo.uri,
              mimeType: photo.mimeType,
              fileName: photo.fileName,
            });
          }
        } catch (e: any) {
          // Log error but don't block navigation
          console.error("Failed to upload photos:", e);
        }
      }

      navigation.replace("Vehicles");
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

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

      <Text style={styles.h1}>{t("vehicleForm.title")}</Text>


      {/* Photos Section */}
      <View style={styles.photosSection}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>
          {t("vehicleForm.photos")} ({photoUris.length}/6)
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
              // Map back to photoUris in new order based on uri
              const newPhotoUris: PhotoFile[] = data.map((item) => ({
                uri: item.uri,
                mimeType: item.mimeType,
                fileName: item.fileName,
              }));
              setPhotoUris(newPhotoUris);
            }}
          />
        ) : null}
        {photoUris.length < 6 && (
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
              type === "car" && { borderColor: theme.colors.fg },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                {
                  color: type === "car" ? theme.colors.fg : theme.colors.muted,
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
              type === "motorcycle" && { borderColor: theme.colors.fg },
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
        label={t("vehicleForm.vinLabel")}
        value={vin}
        onChangeText={setVin}
        autoCapitalize="characters"
        placeholder={t("vehicleForm.placeholderVin")}
      />
      <TextField
        label={t("vehicleForm.makeLabel")}
        value={make}
        onChangeText={setMake}
        placeholder={t("vehicleForm.placeholderMake")}
      />
      <TextField
        label={t("vehicleForm.modelLabel")}
        value={model}
        onChangeText={setModel}
        placeholder={t("vehicleForm.placeholderModel")}
      />
      <TextField
        label={t("vehicleForm.yearLabel")}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t("vehicleForm.placeholderYear")}
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
        placeholder={t("vehicleForm.placeholderEngineCapacity")}
      />
      <TextField
        label={t("vehicleForm.powerHpLabel")}
        value={powerHp}
        onChangeText={setPowerHp}
        keyboardType="number-pad"
        placeholder={t("vehicleForm.placeholderPowerHp")}
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
                transmission === tr && { borderColor: theme.colors.fg },
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
                driveType === dt && { borderColor: theme.colors.fg },
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
        placeholder={t("vehicleForm.placeholderNotes")}
      />
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
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
    },
    typeChip: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    typeChipText: {
      fontWeight: "700",
    },
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
      width: (Dimensions.get("window").width - theme.spacing.md * 2 - theme.spacing.sm * 2) / 3,
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
    photoCardActive: {
      opacity: 0.8,
      transform: [{ scale: 1.05 }],
      zIndex: 10,
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
      color: theme.colors.fg,
      fontSize: 11,
      fontWeight: "700",
    },
  });
