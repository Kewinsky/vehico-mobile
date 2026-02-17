import { useCallback, useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { DraggableGrid } from "react-native-draggable-grid";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  isValidProductionYear,
  isNonNegativeNumber,
} from "../utils/validation";
import type {
  VehiclePhoto,
  VehicleType,
  FuelType,
  TransmissionType,
  DriveType,
} from "../types/domain";
import {
  createVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "../services/vehicles/vehiclesRepo";
import {
  deleteVehiclePhoto,
  getVehiclePhotoUrl,
  listVehiclePhotos,
  reorderVehiclePhotos,
  uploadVehiclePhoto,
} from "../services/vehicles/uploadPhoto";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { SegmentTabs } from "../ui/components/SegmentTabs";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { maybeHandleBackendEntitlementLimitError } from "../ui/limits/entitlementAlerts";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { Textarea } from "../ui/components/Textarea";
import { DriveTypeIcon } from "../ui/components/DriveTypeIcon";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleForm">;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Use local time to avoid UTC date shifting.
  return new Date(year, month - 1, day);
}

export function VehicleFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { vehiclesLimit, isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = makeStyles(theme);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const vehicleId = route.params?.vehicleId;
  const isEditMode = !!vehicleId;
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const [loading, setLoading] = useState(isEditMode);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
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
  const [insuranceValidUntil, setInsuranceValidUntil] = useState("");
  const [inspectionValidUntil, setInspectionValidUntil] = useState("");
  const [openDatePicker, setOpenDatePicker] = useState<
    "insurance" | "inspection" | null
  >(null);
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  type PhotoFile = {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  };
  const [photoUris, setPhotoUris] = useState<PhotoFile[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
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
      setInsuranceValidUntil(v.insurance_valid_until ?? "");
      setInspectionValidUntil(v.inspection_valid_until ?? "");

      const photosList = await listVehiclePhotos(
        vehicleId,
        isPremium ? undefined : { limit: photosPerVehicleLimit },
      );
      setPhotos(photosList);
      setPhotoUrls(photosList.map((photo) => getVehiclePhotoUrl(photo)));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t, isPremium, photosPerVehicleLimit]);

  useEffect(() => {
    if (isEditMode) void load();
  }, [isEditMode, load]);

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

  function openPicker(kind: "insurance" | "inspection") {
    const currentYmd =
      kind === "insurance" ? insuranceValidUntil : inspectionValidUntil;
    setDatePickerDraft(
      parseYmd(currentYmd || new Date().toISOString().slice(0, 10)),
    );
    setOpenDatePicker(kind);
  }

  function cancelPicker() {
    setOpenDatePicker(null);
  }

  function confirmPicker() {
    if (!openDatePicker) return;
    const ymd = formatYmd(datePickerDraft);
    if (openDatePicker === "insurance") setInsuranceValidUntil(ymd);
    if (openDatePicker === "inspection") setInspectionValidUntil(ymd);
    setOpenDatePicker(null);
  }

  function renderInlineDatePicker() {
    return (
      <View
        style={[
          styles.pickerWrap,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <DateTimePicker
          value={datePickerDraft}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={
            Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
              ? "dark"
              : "light"
          }
          onChange={(event, selectedDate) => {
            if (Platform.OS === "ios") {
              if (selectedDate) setDatePickerDraft(selectedDate);
              return;
            }

            // Android: native dialog returns once (set/dismissed).
            setOpenDatePicker(null);
            if (event?.type === "dismissed") return;
            if (selectedDate) {
              const ymd = formatYmd(selectedDate);
              if (openDatePicker === "insurance") setInsuranceValidUntil(ymd);
              if (openDatePicker === "inspection") setInspectionValidUntil(ymd);
            }
          }}
        />
        {Platform.OS === "ios" ? (
          <View style={styles.pickerActionsRow}>
            <Pressable
              onPress={cancelPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.pickerActionText, { color: theme.colors.muted }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: accentBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerActionText,
                  { color: theme.colors.accent },
                ]}
              >
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

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

  function pickSource() {
    const photoCount = isEditMode ? photos.length : photoUris.length;
    const remainingSlots = 6 - photoCount;
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
      const remainingSlots =
        6 - (isEditMode ? photos.length : photoUris.length);
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
      if (isEditMode && vehicleId) {
        await uploadVehiclePhoto({
          vehicleId,
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
        });
        await load();
        toastSuccess(t("manageVehicle.photoAdded"));
      } else {
        setPhotoUris([
          ...photoUris,
          {
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          },
        ]);
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots =
        6 - (isEditMode ? photos.length : photoUris.length);
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
      if (isEditMode && vehicleId) {
        const uploads = result.assets.slice(0, remainingSlots).map((asset) =>
          uploadVehiclePhoto({
            vehicleId,
            fileUri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          }),
        );
        await Promise.all(uploads);
        await load();
        toastSuccess(t("manageVehicle.photoAdded"));
      } else {
        const newPhotos = result.assets
          .slice(0, remainingSlots)
          .map((asset) => ({
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          }))
          .filter((photo) => !!photo.uri) as PhotoFile[];
        setPhotoUris([...photoUris, ...newPhotos]);
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots =
        6 - (isEditMode ? photos.length : photoUris.length);
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
      if (isEditMode && vehicleId) {
        const uploads = result.assets.slice(0, remainingSlots).map((asset) =>
          uploadVehiclePhoto({
            vehicleId,
            fileUri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.name ?? null,
            maxPhotos: photosPerVehicleLimit,
          }),
        );
        await Promise.all(uploads);
        await load();
        toastSuccess(t("manageVehicle.photoAdded"));
      } else {
        const newPhotos = result.assets
          .slice(0, remainingSlots)
          .map((asset) => ({
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.name ?? null,
          }))
          .filter((photo) => !!photo.uri) as PhotoFile[];
        setPhotoUris([...photoUris, ...newPhotos]);
      }
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
            onPress={() =>
              removePhoto(currentIndex >= 0 ? currentIndex : item.index)
            }
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

  type EditPhotoItem = {
    key: string;
    photoId: string;
    url: string;
    index: number;
  };

  const editPhotoItems: EditPhotoItem[] = useMemo(
    () =>
      photos
        .map((photo, index) => ({
          key: photo.id,
          photoId: photo.id,
          url: photoUrls[index] || "",
          index,
        }))
        .filter((item) => item.url),
    [photos, photoUrls],
  );

  const removeEditPhoto = useCallback(
    async (photo: VehiclePhoto) => {
      try {
        await deleteVehiclePhoto(photo);
        await load();
        toastSuccess(t("manageVehicle.photoRemoved"));
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      }
    },
    [load, t],
  );

  const renderEditPhotoItem = (item: EditPhotoItem) => {
    const photo = photos.find((p) => p.id === item.photoId);
    if (!photo) return <View style={styles.photoCard} />;
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
            onPress={() => void removeEditPhoto(photo)}
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

  async function onSave() {
    try {
      setSaving(true);
      if (!isValidProductionYear(year)) {
        toastError(
          t("validation.invalidYear", { max: new Date().getFullYear() + 2 }),
        );
        return;
      }
      const production_year = Number(year.trim());
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

      const payload = {
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
        insurance_valid_until: insuranceValidUntil.trim().length
          ? insuranceValidUntil.trim()
          : null,
        inspection_valid_until: inspectionValidUntil.trim().length
          ? inspectionValidUntil.trim()
          : null,
      };

      if (isEditMode && vehicleId) {
        await updateVehicle(vehicleId, payload);
        navigation.goBack();
        return;
      }

      // Check vehicle limit (add mode only)
      if (!isPremium) {
        const vehicles = await listVehicles();
        if (vehicles.length >= vehiclesLimit) {
          Alert.alert(
            t("limits.vehicleLimitReachedTitle"),
            t("limits.vehicleLimitReachedBody", { limit: vehiclesLimit }),
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

      const created = await createVehicle(payload);

      // Upload photos if selected (add mode)
      if (photoUris.length > 0) {
        try {
          for (const photo of photoUris) {
            await uploadVehiclePhoto({
              vehicleId: created.id,
              fileUri: photo.uri,
              mimeType: photo.mimeType,
              fileName: photo.fileName,
              maxPhotos: photosPerVehicleLimit,
            });
          }
        } catch (e: any) {
          console.error("Failed to upload photos:", e);
          toastError(e?.message ?? t("common.error"));
        }
      }

      navigation.replace("Vehicles");
    } catch (e: any) {
      if (maybeHandleBackendEntitlementLimitError(e, t, navigation)) return;
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      scrollEnabled={!isDragging}
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
    >
      <Text style={styles.h1}>
        {isEditMode ? t("manageVehicle.editTitle") : t("vehicleForm.title")}
      </Text>

      {isEditMode && loading ? (
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      ) : (
        <>
          <View>
            <View style={[styles.rowLeft, { marginBottom: theme.spacing.xs }]}>
              <Ionicons
                name="images-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {t("vehicleForm.photos")} (
                {isEditMode ? photos.length : photoUris.length}/6)
              </Text>
            </View>
            {isEditMode
              ? editPhotoItems.length > 0 && (
                  <DraggableGrid
                    numColumns={3}
                    renderItem={renderEditPhotoItem}
                    data={editPhotoItems}
                    onDragStart={() => setIsDragging(true)}
                    onDragRelease={async (data) => {
                      setIsDragging(false);
                      const newPhotos = data
                        .map((item) =>
                          photos.find(
                            (p) => p.id === (item as EditPhotoItem).photoId,
                          ),
                        )
                        .filter((p): p is VehiclePhoto => !!p);
                      setPhotos(newPhotos);
                      setPhotoUrls(
                        newPhotos.map((p) => {
                          const i = photos.findIndex((x) => x.id === p.id);
                          return photoUrls[i] ?? "";
                        }),
                      );
                      await reorderVehiclePhotos(
                        vehicleId!,
                        newPhotos.map((p) => p.id),
                      );
                    }}
                  />
                )
              : photoItems.length > 0 && (
                  <DraggableGrid
                    numColumns={3}
                    renderItem={renderPhotoItem}
                    data={photoItems}
                    onDragStart={() => setIsDragging(true)}
                    onDragRelease={(data) => {
                      setIsDragging(false);
                      const newPhotoUris: PhotoFile[] = data.map((item) => ({
                        uri: item.uri,
                        mimeType: item.mimeType,
                        fileName: item.fileName,
                      }));
                      setPhotoUris(newPhotoUris);
                    }}
                  />
                )}
            {(isEditMode ? photos.length : photoUris.length) < 6 && (
              <Button
                onPress={pickSource}
                disabled={saving || uploadingPhoto}
                variant="ghost"
                style={{ marginTop: theme.spacing.xs / 2 }}
              >
                {t("vehicleForm.addPhoto")}
              </Button>
            )}
          </View>

          <View style={{ height: theme.spacing.xl }} />

          <View
            style={[
              styles.segmentWrap,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.bg,
              },
            ]}
          >
            <Pressable
              onPress={() => setType("car")}
              style={[
                styles.segment,
                type === "car" && [
                  styles.segmentSelected,
                  {
                    backgroundColor: accentBg,
                    borderColor: theme.colors.accent,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      type === "car" ? theme.colors.accent : theme.colors.muted,
                  },
                ]}
              >
                {t("vehicleForm.car")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType("motorcycle")}
              style={[
                styles.segment,
                type === "motorcycle" && [
                  styles.segmentSelected,
                  {
                    backgroundColor: accentBg,
                    borderColor: theme.colors.accent,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      type === "motorcycle"
                        ? theme.colors.accent
                        : theme.colors.muted,
                  },
                ]}
              >
                {t("vehicleForm.motorcycle")}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: theme.spacing.sm }} />

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
                  name="barcode-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.vinLabel")}
                </Text>
              </View>
              <TextInput
                value={vin}
                onChangeText={setVin}
                autoCapitalize="characters"
                editable={!saving}
                placeholder={t("vehicleForm.placeholderVin")}
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
                  name="car-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.makeLabel")}
                </Text>
              </View>
              <TextInput
                value={make}
                onChangeText={setMake}
                editable={!saving}
                placeholder={t("vehicleForm.placeholderMake")}
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
                  name="pricetag-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.modelLabel")}
                </Text>
              </View>
              <TextInput
                value={model}
                onChangeText={setModel}
                editable={!saving}
                placeholder={t("vehicleForm.placeholderModel")}
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
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.yearLabel")}
                </Text>
              </View>
              <TextInput
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                editable={!saving}
                placeholder={t("vehicleForm.placeholderYear")}
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
                  name="speedometer-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.mileageLabel")} ({distanceUnit})
                </Text>
              </View>
              <TextInput
                value={mileage}
                onChangeText={setMileage}
                keyboardType="number-pad"
                editable={!saving}
                placeholder={t("vehicleForm.placeholderMileage")}
                placeholderTextColor={theme.colors.muted}
                style={[
                  styles.input,
                  { color: theme.colors.fg, textAlign: "right" },
                ]}
              />
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <View
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() =>
                showPicker<FuelType>({
                  title: t("vehicleForm.fuelTypeLabel"),
                  value: fuelType,
                  options: [
                    "petrol",
                    "diesel",
                    "hybrid",
                    "electric",
                    "lpg",
                  ] as const,
                  getLabel: (value) =>
                    t(
                      `vehicleForm.fuelType${
                        value.charAt(0).toUpperCase() + value.slice(1)
                      }` as
                        | "vehicleForm.fuelTypePetrol"
                        | "vehicleForm.fuelTypeDiesel"
                        | "vehicleForm.fuelTypeHybrid"
                        | "vehicleForm.fuelTypeElectric"
                        | "vehicleForm.fuelTypeLpg",
                    ),
                  onChange: setFuelType,
                  placeholderLabel: t("vehicleForm.fuelTypePlaceholder"),
                })
              }
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="water-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.fuelTypeLabel")}
                </Text>
              </View>
              <Text
                style={[
                  styles.valueText,
                  {
                    color: fuelType ? theme.colors.fg : theme.colors.muted,
                    textAlign: "right",
                  },
                ]}
                numberOfLines={1}
              >
                {fuelType
                  ? t(
                      `vehicleForm.fuelType${
                        fuelType.charAt(0).toUpperCase() + fuelType.slice(1)
                      }` as any,
                    )
                  : t("vehicleForm.fuelTypePlaceholder")}
              </Text>
            </Pressable>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons
                  name="engine"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.engineCapacityLabel")}
                </Text>
              </View>
              <TextInput
                value={engineCapacity}
                onChangeText={setEngineCapacity}
                keyboardType="number-pad"
                editable={!saving}
                placeholder={t("vehicleForm.placeholderEngineCapacity")}
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
                  name="flash-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.powerHpLabel")}
                </Text>
              </View>
              <TextInput
                value={powerHp}
                onChangeText={setPowerHp}
                keyboardType="number-pad"
                editable={!saving}
                placeholder={t("vehicleForm.placeholderPowerHp")}
                placeholderTextColor={theme.colors.muted}
                style={[
                  styles.input,
                  { color: theme.colors.fg, textAlign: "right" },
                ]}
              />
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />

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
                <MaterialCommunityIcons
                  name="car-shift-pattern"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.transmissionLabel")}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SegmentTabs<TransmissionType>
                  value={transmission ?? "manual"}
                  options={[
                    {
                      value: "manual",
                      label: t("vehicleForm.transmissionManual"),
                    },
                    {
                      value: "automatic",
                      label: t("vehicleForm.transmissionAutomatic"),
                    },
                  ]}
                  onChange={setTransmission}
                />
              </View>
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <DriveTypeIcon size={20} color={theme.colors.accent} />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.driveTypeLabel")}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SegmentTabs<DriveType>
                  value={driveType ?? "FWD"}
                  options={[
                    { value: "FWD", label: "FWD" },
                    { value: "RWD", label: "RWD" },
                    { value: "AWD", label: "AWD" },
                  ]}
                  onChange={setDriveType}
                />
              </View>
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <View
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() => openPicker("insurance")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("manageVehicle.insuranceLabel")}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: insuranceValidUntil
                        ? theme.colors.fg
                        : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {insuranceValidUntil || t("manageVehicle.selectDate")}
                </Text>
                {insuranceValidUntil ? (
                  <Pressable
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setInsuranceValidUntil("");
                    }}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.muted}
                      style={{ marginLeft: theme.spacing.xs }}
                    />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
            {openDatePicker === "insurance" ? (
              <>
                {renderInlineDatePicker()}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}
            <Pressable
              onPress={() => openPicker("inspection")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("manageVehicle.inspectionLabel")}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: inspectionValidUntil
                        ? theme.colors.fg
                        : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {inspectionValidUntil || t("manageVehicle.selectDate")}
                </Text>
                {inspectionValidUntil ? (
                  <Pressable
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setInspectionValidUntil("");
                    }}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.colors.muted}
                      style={{ marginLeft: theme.spacing.xs }}
                    />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
            {openDatePicker === "inspection" ? renderInlineDatePicker() : null}
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <View
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View
              style={{
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("vehicleForm.notesLabel")}
                </Text>
              </View>
              <View style={{ marginTop: theme.spacing.xs }}>
                <Textarea
                  value={notes}
                  onChangeText={setNotes}
                  editable={!saving}
                  multiline
                  placeholder={t("vehicleForm.placeholderNotes")}
                  placeholderTextColor={theme.colors.muted}
                  style={[styles.inputMultiline, { color: theme.colors.fg }]}
                />
              </View>
            </View>
          </View>
        </>
      )}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
      marginVertical: theme.spacing.md,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    segmentWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 2,
    },
    segment: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentSelected: { borderWidth: 1 },
    segmentText: { fontSize: theme.typography.body, fontWeight: "700" },
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
    rowMultiline: { alignItems: "flex-start" },
    divider: { height: 1, width: "100%" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    inputMultiline: { minHeight: 96, paddingTop: 2 },
    label: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
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
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    photoCardActive: {
      opacity: 0.8,
      transform: [{ scale: 1.05 }],
      zIndex: 10,
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
      borderRadius: theme.radius.md,
      opacity: 0.7,
    },
    photoMainBadge: {
      position: "absolute",
      top: theme.spacing.xs,
      left: theme.spacing.xs,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    photoMainText: {
      color: "#000000",
      fontSize: theme.typography.xs,
      fontWeight: "700",
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
