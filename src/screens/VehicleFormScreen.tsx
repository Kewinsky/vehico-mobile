import { useMemo, useState } from "react";
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
  VehicleType,
  FuelType,
  TransmissionType,
  DriveType,
} from "../types/domain";
import { createVehicle, listVehicles } from "../services/vehicles/vehiclesRepo";
import { uploadVehiclePhoto } from "../services/vehicles/uploadPhoto";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { SegmentTabs } from "../ui/components/SegmentTabs";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { FollowCursorTextInput } from "../ui/components/FollowCursorTextInput";

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

export function VehicleFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { vehiclesLimit, isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = makeStyles(theme);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
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

  function stripExamplePrefix(s: string) {
    return s
      .replace(/^e\.g\.\s*/i, "")
      .replace(/^np\.\s*/i, "")
      .trim();
  }

  function makePlaceholder(label: string, example: string) {
    const ex = stripExamplePrefix(example);
    return ex ? `${label}: ${ex}` : `${label}:`;
  }

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
      ],
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
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
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

      // Check vehicle limit
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
        insurance_valid_until: insuranceValidUntil.trim().length
          ? insuranceValidUntil.trim()
          : null,
        inspection_valid_until: inspectionValidUntil.trim().length
          ? inspectionValidUntil.trim()
          : null,
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
              maxPhotos: photosPerVehicleLimit,
            });
          }
        } catch (e: any) {
          // Log error but don't block navigation
          console.error("Failed to upload photos:", e);
          toastError(e?.message ?? t("common.error"));
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
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("vehicleForm.title")}</Text>

      {/* Photos Section */}
      <View style={styles.photosSection}>
        <Text style={styles.sectionTitle}>
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
          <Button
            onPress={pickSource}
            disabled={saving || uploadingPhoto}
            variant="ghost"
          >
            {t("vehicleForm.addPhoto")}
          </Button>
        )}
      </View>

      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.sectionTitle}>{t("vehicleForm.type")}</Text>
      <SegmentTabs<VehicleType>
        value={type}
        options={[
          { value: "car", label: t("vehicleForm.car") },
          { value: "motorcycle", label: t("vehicleForm.motorcycle") },
        ]}
        onChange={setType}
      />

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
          <Ionicons
            name="barcode-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={vin}
            onChangeText={setVin}
            autoCapitalize="characters"
            editable={!saving}
            placeholder={makePlaceholder(
              t("vehicleForm.vinLabel"),
              t("vehicleForm.placeholderVin"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons name="car-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={make}
            onChangeText={setMake}
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("vehicleForm.makeLabel")}`,
              t("vehicleForm.placeholderMake"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="pricetag-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={model}
            onChangeText={setModel}
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("vehicleForm.modelLabel")}`,
              t("vehicleForm.placeholderModel"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("vehicleForm.yearLabel")}`,
              t("vehicleForm.placeholderYear"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="speedometer-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={mileage}
            onChangeText={setMileage}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              `${t("vehicleForm.mileageLabel")} (${distanceUnit})`,
              t("vehicleForm.placeholderMileage"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
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
              placeholderLabel: t("common.all"),
            })
          }
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="water-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {fuelType
              ? t(
                  `vehicleForm.fuelType${
                    fuelType.charAt(0).toUpperCase() + fuelType.slice(1)
                  }` as any,
                )
              : t("vehicleForm.fuelTypeLabel")}
          </Text>
        </Pressable>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="construct-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={engineCapacity}
            onChangeText={setEngineCapacity}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              t("vehicleForm.engineCapacityLabel"),
              t("vehicleForm.placeholderEngineCapacity"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="flash-outline"
            size={20}
            color={theme.colors.accent}
          />
          <TextInput
            value={powerHp}
            onChangeText={setPowerHp}
            keyboardType="number-pad"
            editable={!saving}
            placeholder={makePlaceholder(
              t("vehicleForm.powerHpLabel"),
              t("vehicleForm.placeholderPowerHp"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
      </View>

      <View style={{ height: theme.spacing.sm }} />

      <Text style={styles.sectionTitle}>
        {t("vehicleForm.transmissionLabel")}
      </Text>
      <SegmentTabs<TransmissionType>
        value={transmission ?? "manual"}
        options={[
          { value: "manual", label: t("vehicleForm.transmissionManual") },
          { value: "automatic", label: t("vehicleForm.transmissionAutomatic") },
        ]}
        onChange={setTransmission}
      />

      <View style={{ height: theme.spacing.sm }} />

      <Text style={styles.sectionTitle}>{t("vehicleForm.driveTypeLabel")}</Text>
      <SegmentTabs<DriveType>
        value={driveType ?? "FWD"}
        options={[
          { value: "FWD", label: "FWD" },
          { value: "RWD", label: "RWD" },
          { value: "AWD", label: "AWD" },
        ]}
        onChange={setDriveType}
      />

      <View style={{ height: theme.spacing.sm }} />

      <Text style={styles.sectionTitle}>
        {t("dashboard.stats.insuranceAndInspection")}
      </Text>
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
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {insuranceValidUntil || t("manageVehicle.insuranceLabel")}
          </Text>
          {insuranceValidUntil ? (
            <Pressable
              onPress={(e) => {
                // Prevent opening the date picker when clearing.
                e?.stopPropagation?.();
                setInsuranceValidUntil("");
              }}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="close-circle" size={20} color="#000000" />
            </Pressable>
          ) : null}
        </Pressable>
        {openDatePicker === "insurance" ? (
          <>
            {renderInlineDatePicker()}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </>
        ) : (
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
        )}
        <Pressable
          onPress={() => openPicker("inspection")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {inspectionValidUntil || t("manageVehicle.inspectionLabel")}
          </Text>
          {inspectionValidUntil ? (
            <Pressable
              onPress={(e) => {
                // Prevent opening the date picker when clearing.
                e?.stopPropagation?.();
                setInspectionValidUntil("");
              }}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="close-circle" size={20} color="#000000" />
            </Pressable>
          ) : null}
        </Pressable>
        {openDatePicker === "inspection" ? renderInlineDatePicker() : null}
      </View>

      <View style={{ height: theme.spacing.sm }} />

      <Text style={styles.sectionTitle}>{t("vehicleForm.notesLabel")}</Text>
      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <View style={[styles.row, styles.rowMultiline]}>
          <Ionicons
            name="create-outline"
            size={20}
            color={theme.colors.accent}
          />
          <FollowCursorTextInput
            value={notes}
            onChangeText={setNotes}
            editable={!saving}
            multiline
            placeholder={makePlaceholder(
              t("vehicleForm.notesLabel"),
              t("vehicleForm.placeholderNotes"),
            )}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              styles.inputMultiline,
              { color: theme.colors.fg },
            ]}
          />
        </View>
      </View>
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
      fontWeight: "700",
      color: theme.colors.fg,
    },
    sectionTitle: {
      color: theme.colors.fg,
      fontWeight: "800",
      fontSize: theme.typography.title,
      marginBottom: theme.spacing.sm,
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
    rowMultiline: { alignItems: "flex-start" },
    divider: { height: 1, width: "100%" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    inputMultiline: { minHeight: 96, paddingTop: 2 },
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
    photosSection: {
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs / 2,
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
  });
