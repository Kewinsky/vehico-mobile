import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { DraggableGrid } from "react-native-draggable-grid";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  buildVehiclePayload,
  canSaveVehicle,
  vehicleFieldErrors,
  type VehicleFormState,
} from "../../forms/vehicleForm";
import type {
  VehiclePhoto,
  VehicleType,
  FuelType,
  TransmissionType,
  DriveType,
} from "../../types/domain";
import {
  createVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
  type UpdateVehicleInput,
} from "../../services/vehicles/vehiclesRepo";
import { insertMileageAudit } from "../../services/mileage/mileageAuditRepo";
import {
  deleteVehiclePhoto,
  getVehiclePhotoUrl,
  listVehiclePhotos,
  reorderVehiclePhotos,
  uploadVehiclePhoto,
} from "../../services/vehicles/uploadPhoto";
import { Button } from "../../ui/components/common/Button";
import { AttachmentSourcePicker } from "../../ui/components/common/AttachmentSourcePicker";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { Hash, CalendarCheck, Fuel } from "lucide-react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { useTheme } from "../../ui/ThemeProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { Textarea } from "../../ui/components/common/Textarea";
import { DriveTypeIcon } from "../../ui/components/icons/DriveTypeIcon";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { formatYmd } from "../../utils/dateYmd";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleForm">;

export function VehicleFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehiclesLimit, isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = makeStyles(theme);
  const { distanceUnitLabel } = useUnitDisplay();
  const vehicleId = route.params?.vehicleId;
  const isEditMode = !!vehicleId;
  const [loading, setLoading] = useState(isEditMode);
  const [initialPhotos, setInitialPhotos] = useState<VehiclePhoto[]>([]);
  const [type, setType] = useState<VehicleType>("car");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [initialMileage, setInitialMileage] = useState("");
  const [mileage, setMileage] = useState("");
  const [firstRegistrationDate, setFirstRegistrationDate] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
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
  const [saving, setSaving] = useState(false);
  type PhotoFile = {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
  };
  type DraftPhotoItem = {
    key: string;
    kind: "existing" | "new";
    previewUri: string;
    photo?: VehiclePhoto;
    file?: PhotoFile;
  };
  const [draftPhotos, setDraftPhotos] = useState<DraftPhotoItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchingPhotoGrid, setIsTouchingPhotoGrid] = useState(false);
  const nextDraftPhotoKeyRef = useRef(0);
  const initialMileageRef = useRef<number | null | undefined>(undefined);

  function createDraftPhotoKey(prefix: "existing" | "new") {
    const key = `${prefix}-${nextDraftPhotoKeyRef.current}`;
    nextDraftPhotoKeyRef.current += 1;
    return key;
  }

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
      setInitialMileage(
        v.initial_mileage != null ? String(v.initial_mileage) : "",
      );
      setMileage(v.mileage ? String(v.mileage) : "");
      initialMileageRef.current = v.mileage;
      setFirstRegistrationDate(v.first_registration_date ?? "");
      setLicensePlate(v.license_plate ?? "");
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
      setInitialPhotos(photosList);
      setDraftPhotos(
        photosList.map((photo) => ({
          key: createDraftPhotoKey("existing"),
          kind: "existing" as const,
          previewUri: getVehiclePhotoUrl(photo),
          photo,
        })),
      );
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t, isPremium, photosPerVehicleLimit]);

  useEffect(() => {
    if (isEditMode) void load();
  }, [isEditMode, load]);

  const formValues = useMemo(
    (): VehicleFormState => ({
      type,
      vin,
      make,
      model,
      year,
      initialMileage,
      mileage,
      firstRegistrationDate,
      licensePlate,
      engineCapacity,
      powerHp,
      fuelType,
      transmission,
      driveType,
      notes,
      insuranceValidUntil,
      inspectionValidUntil,
    }),
    [
      type,
      vin,
      make,
      model,
      year,
      initialMileage,
      mileage,
      firstRegistrationDate,
      licensePlate,
      engineCapacity,
      powerHp,
      fuelType,
      transmission,
      driveType,
      notes,
      insuranceValidUntil,
      inspectionValidUntil,
    ],
  );

  const fieldErrors = useMemo(
    () => vehicleFieldErrors(formValues),
    [formValues],
  );

  const canSave = useMemo(() => canSaveVehicle(formValues), [formValues]);

  const { fieldError, validateBeforeSave } = useFormFieldErrors(canSave);

  const fuelTypeOptions = useMemo(
    () => ["petrol", "diesel", "hybrid", "electric", "lpg"] as const,
    [],
  );

  const getFuelTypeLabel = useCallback(
    (value: FuelType) =>
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
    [t],
  );

  async function pickFromCamera() {
    try {
      const remainingSlots = 6 - draftPhotos.length;
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
      setDraftPhotos((prev) => [
        ...prev,
        {
          key: createDraftPhotoKey("new"),
          kind: "new",
          previewUri: asset.uri,
          file: {
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          },
        },
      ]);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots = 6 - draftPhotos.length;
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
          key: createDraftPhotoKey("new"),
          kind: "new" as const,
          previewUri: asset.uri,
          file: {
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
          },
        }))
        .filter((photo) => !!photo.previewUri);
      setDraftPhotos((prev) => [...prev, ...newPhotos]);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots = 6 - draftPhotos.length;
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
          key: createDraftPhotoKey("new"),
          kind: "new" as const,
          previewUri: asset.uri,
          file: {
            uri: asset.uri,
            mimeType: asset.mimeType ?? null,
            fileName: asset.name ?? null,
          },
        }))
        .filter((photo) => !!photo.previewUri);
      setDraftPhotos((prev) => [...prev, ...newPhotos]);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removeDraftPhoto(key: string) {
    setDraftPhotos((prev) => prev.filter((photo) => photo.key !== key));
  }

  const renderPhotoItem = (item: DraftPhotoItem) => {
    const currentIndex = draftPhotos.findIndex((p) => p.key === item.key);
    const isMain = currentIndex === 0;
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoImageContainer}>
          <Image
            source={{ uri: item.previewUri }}
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
            onPress={() => removeDraftPhoto(item.key)}
            disabled={saving || uploadingPhoto}
            style={styles.photoDeleteButton}
            hitSlop={5}
          >
            <Ionicons
              name="close-circle"
              size={28}
              color={theme.colors.accent}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  async function onSave() {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
      const payload = buildVehiclePayload(formValues);

      if (isEditMode && vehicleId) {
        const patch: UpdateVehicleInput = { ...payload };
        const newMileage = patch.mileage ?? null;
        if (
          initialMileageRef.current !== undefined &&
          newMileage !== initialMileageRef.current
        ) {
          patch.mileage_updated_at =
            newMileage != null ? formatYmd(new Date()) : null;
        }
        await updateVehicle(vehicleId, patch);
        if (
          newMileage != null &&
          initialMileageRef.current !== undefined &&
          newMileage !== initialMileageRef.current
        ) {
          await insertMileageAudit({
            vehicle_id: vehicleId,
            reading_date: patch.mileage_updated_at ?? formatYmd(new Date()),
            mileage: newMileage,
            source: "profile",
          });
        }

        const currentExistingIds = new Set(
          draftPhotos
            .filter((photo) => photo.kind === "existing" && photo.photo)
            .map((photo) => photo.photo!.id),
        );
        const removedPhotos = initialPhotos.filter(
          (photo) => !currentExistingIds.has(photo.id),
        );

        for (const photo of removedPhotos) {
          await deleteVehiclePhoto(photo);
        }

        const uploadedPhotosByKey = new Map<string, VehiclePhoto>();
        for (const draftPhoto of draftPhotos) {
          if (draftPhoto.kind !== "new" || !draftPhoto.file) continue;
          const file = draftPhoto.file;
          const uploadedPhoto = await uploadVehiclePhoto({
            vehicleId,
            fileUri: file.uri,
            mimeType: file.mimeType,
            fileName: file.fileName,
            maxPhotos: photosPerVehicleLimit,
          });
          uploadedPhotosByKey.set(draftPhoto.key, uploadedPhoto);
        }

        const orderedPhotoIds = draftPhotos
          .map((draftPhoto) => {
            if (draftPhoto.kind === "existing")
              return draftPhoto.photo?.id ?? null;
            return uploadedPhotosByKey.get(draftPhoto.key)?.id ?? null;
          })
          .filter((photoId): photoId is string => !!photoId);

        if (orderedPhotoIds.length > 0) {
          await reorderVehiclePhotos(vehicleId, orderedPhotoIds);
        }

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
            getPremiumUpgradeAlertButtons(t, navigation),
          );
          return;
        }
      }

      const created = await createVehicle(payload);

      // Upload photos if selected (add mode)
      const newDraftPhotos = draftPhotos.filter(
        (photo): photo is DraftPhotoItem & { kind: "new"; file: PhotoFile } =>
          photo.kind === "new" && !!photo.file,
      );
      if (newDraftPhotos.length > 0) {
        try {
          for (const photo of newDraftPhotos) {
            await uploadVehiclePhoto({
              vehicleId: created.id,
              fileUri: photo.file.uri,
              mimeType: photo.file.mimeType,
              fileName: photo.file.fileName,
              maxPhotos: photosPerVehicleLimit,
            });
          }
        } catch (e: any) {
          console.error("Failed to upload photos:", e);
          toastCaughtError(e, t("common.error"));
        }
      }

      navigation.goBack();
    } catch (e: any) {
      if (handleAndShowLimitErrorAlert(e, t, navigation)) return;
      toastCaughtError(e, t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={isEditMode ? t("manageVehicle.editTitle") : t("vehicleForm.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving || uploadingPhoto,
        loading: saving || uploadingPhoto,
      }}
      loading={isEditMode && loading}
    >
      <FormScreen scrollEnabled={!isDragging && !isTouchingPhotoGrid} noLayout>
        <NativeHeaderScrollView>
          {isEditMode && loading ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
          ) : (
            <>
              <View>
                <View
                  style={[styles.rowLeft, { marginBottom: theme.spacing.xs }]}
                >
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("vehicleForm.photos")} ({draftPhotos.length}/6)
                  </Text>
                </View>
                {draftPhotos.length > 0 && (
                  <View
                    style={styles.photoGridContainer}
                    onTouchStart={() => setIsTouchingPhotoGrid(true)}
                    onTouchEnd={() => setIsTouchingPhotoGrid(false)}
                    onTouchCancel={() => setIsTouchingPhotoGrid(false)}
                  >
                    <DraggableGrid
                      numColumns={3}
                      renderItem={renderPhotoItem}
                      data={draftPhotos}
                      style={styles.photoGrid}
                      onDragStart={() => setIsDragging(true)}
                      onDragRelease={(data) => {
                        setIsDragging(false);
                        setIsTouchingPhotoGrid(false);
                        setDraftPhotos(data as DraftPhotoItem[]);
                      }}
                    />
                  </View>
                )}
                {draftPhotos.length < 6 && (
                  <AttachmentSourcePicker
                    label={t("vehicleForm.addPhoto")}
                    disabled={saving || uploadingPhoto}
                    triggerStyle={{ marginTop: theme.spacing.sm / 2 }}
                    handlers={{
                      onCamera: () => void pickFromCamera(),
                      onPhotos: () => void pickFromGallery(),
                      onFiles: () => void pickFromFiles(),
                    }}
                  />
                )}
              </View>

              <View style={{ height: theme.spacing.xl }} />

              <SegmentTabs<VehicleType>
                variant="secondary"
                value={type}
                options={[
                  { value: "car", label: t("vehicleForm.car") },
                  { value: "motorcycle", label: t("vehicleForm.motorcycle") },
                ]}
                onChange={setType}
              />

              <View style={{ height: theme.spacing.sm }} />

              <Card>
                <FormInputRow
                  icon="barcode-outline"
                  label={t("vehicleForm.vinLabel")}
                  value={vin}
                  onChangeText={setVin}
                  autoCapitalize="characters"
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderVinMotorcycle")
                      : t("vehicleForm.placeholderVin")
                  }
                />

                <FormInputRow
                  icon="car-outline"
                  label={t("vehicleForm.makeLabel")}
                  value={make}
                  onChangeText={setMake}
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderMakeMotorcycle")
                      : t("vehicleForm.placeholderMake")
                  }
                  error={fieldError(fieldErrors.make)}
                />

                <FormInputRow
                  icon="pricetag-outline"
                  label={t("vehicleForm.modelLabel")}
                  value={model}
                  onChangeText={setModel}
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderModelMotorcycle")
                      : t("vehicleForm.placeholderModel")
                  }
                  error={fieldError(fieldErrors.model)}
                />

                <FormInputRow
                  icon="calendar-outline"
                  label={t("vehicleForm.yearLabel")}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderYearMotorcycle")
                      : t("vehicleForm.placeholderYear")
                  }
                  error={fieldError(fieldErrors.year)}
                />

                <FormInputRow
                  icon="speedometer-outline"
                  label={`${t("vehicleForm.initialMileageLabel")} (${distanceUnitLabel})`}
                  value={initialMileage}
                  onChangeText={setInitialMileage}
                  keyboardType="number-pad"
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderInitialMileageMotorcycle")
                      : t("vehicleForm.placeholderInitialMileage")
                  }
                  error={fieldError(fieldErrors.initialMileage)}
                />

                <FormInputRow
                  icon="speedometer-outline"
                  label={`${t("vehicleForm.mileageLabel")} (${distanceUnitLabel})`}
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="number-pad"
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderMileageMotorcycle")
                      : t("vehicleForm.placeholderMileage")
                  }
                  error={fieldError(fieldErrors.mileage)}
                />

                <FormDateRow
                  iconComponent={
                    <CalendarCheck size={20} color={theme.colors.accent} />
                  }
                  label={t("vehicleForm.firstRegistrationDateLabel")}
                  value={firstRegistrationDate}
                  onChange={setFirstRegistrationDate}
                  disabled={saving}
                  trailing={
                    firstRegistrationDate ? (
                      <Pressable
                        onPress={() => setFirstRegistrationDate("")}
                        hitSlop={10}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={theme.colors.muted}
                        />
                      </Pressable>
                    ) : null
                  }
                />
                <FormInputRow
                  iconComponent={<Hash size={20} color={theme.colors.accent} />}
                  label={t("vehicleForm.licensePlateLabel")}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  editable={!saving}
                  placeholder={t("vehicleForm.placeholderLicensePlate")}
                />
              </Card>

              <View style={{ height: theme.spacing.sm }} />

              <Card>
                <FormPickerRow<FuelType>
                  iconComponent={<Fuel size={20} color={theme.colors.accent} />}
                  label={t("vehicleForm.fuelTypeLabel")}
                  value={fuelType}
                  options={fuelTypeOptions}
                  getLabel={getFuelTypeLabel}
                  onChange={setFuelType}
                  placeholderLabel={t("vehicleForm.fuelTypePlaceholder")}
                  disabled={saving}
                />

                <FormInputRow
                  iconComponent={
                    <MaterialCommunityIcons
                      name="engine"
                      size={20}
                      color={theme.colors.accent}
                    />
                  }
                  label={t("vehicleForm.engineCapacityLabel")}
                  value={engineCapacity}
                  onChangeText={setEngineCapacity}
                  keyboardType="number-pad"
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderEngineCapacityMotorcycle")
                      : t("vehicleForm.placeholderEngineCapacity")
                  }
                  error={fieldError(fieldErrors.engineCapacity)}
                />

                <FormInputRow
                  icon="flash-outline"
                  label={t("vehicleForm.powerHpLabel")}
                  value={powerHp}
                  onChangeText={setPowerHp}
                  keyboardType="number-pad"
                  editable={!saving}
                  placeholder={
                    type === "motorcycle"
                      ? t("vehicleForm.placeholderPowerHpMotorcycle")
                      : t("vehicleForm.placeholderPowerHp")
                  }
                  error={fieldError(fieldErrors.powerHp)}
                />
              </Card>

              <View style={{ height: theme.spacing.sm }} />

              <Card>
                <FormPickerRow<TransmissionType>
                  iconComponent={
                    <MaterialCommunityIcons
                      name="car-shift-pattern"
                      size={20}
                      color={theme.colors.accent}
                    />
                  }
                  label={t("vehicleForm.transmissionLabel")}
                  value={transmission}
                  options={["manual", "automatic"] as const}
                  getLabel={(value) =>
                    value === "manual"
                      ? t("vehicleForm.transmissionManual")
                      : t("vehicleForm.transmissionAutomatic")
                  }
                  onChange={setTransmission}
                  placeholderLabel={t("common.chooseOption")}
                  disabled={saving}
                />

                <FormPickerRow<DriveType>
                  iconComponent={
                    <DriveTypeIcon size={20} color={theme.colors.accent} />
                  }
                  label={t("vehicleForm.driveTypeLabel")}
                  value={driveType}
                  options={["FWD", "RWD", "AWD"] as const}
                  getLabel={(value) => value}
                  onChange={setDriveType}
                  placeholderLabel={t("common.chooseOption")}
                  disabled={saving}
                />
              </Card>

              <View style={{ height: theme.spacing.sm }} />

              <Card>
                <FormDateRow
                  icon="shield-checkmark-outline"
                  label={t("manageVehicle.insuranceLabel")}
                  value={insuranceValidUntil}
                  onChange={setInsuranceValidUntil}
                  disabled={saving}
                  trailing={
                    insuranceValidUntil ? (
                      <Pressable
                        onPress={() => setInsuranceValidUntil("")}
                        hitSlop={10}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={theme.colors.muted}
                        />
                      </Pressable>
                    ) : null
                  }
                />
                <FormDateRow
                  icon="checkmark-done-outline"
                  label={t("manageVehicle.inspectionLabel")}
                  value={inspectionValidUntil}
                  onChange={setInspectionValidUntil}
                  disabled={saving}
                  trailing={
                    inspectionValidUntil ? (
                      <Pressable
                        onPress={() => setInspectionValidUntil("")}
                        hitSlop={10}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={theme.colors.muted}
                        />
                      </Pressable>
                    ) : null
                  }
                />
              </Card>

              <View style={{ height: theme.spacing.sm }} />

              <Card>
                <View
                  style={{
                    paddingVertical: theme.spacing.md,
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
                      placeholder={
                        type === "motorcycle"
                          ? t("vehicleForm.placeholderNotesMotorcycle")
                          : t("vehicleForm.placeholderNotes")
                      }
                      placeholderTextColor={theme.colors.muted}
                      style={[
                        styles.inputMultiline,
                        {
                          color: theme.colors.fg,
                          paddingTop: theme.spacing.xs,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Card>
              <View style={{ height: theme.spacing.xl * 2 }} />
            </>
          )}
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
    rowMultiline: { alignItems: "flex-start" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    inputMultiline: { minHeight: 96, paddingTop: 2 },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
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
      borderRadius: 999,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    photosGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    photoGridContainer: {
      overflow: "hidden",
    },
    photoGrid: {
      flex: 0,
      overflow: "hidden",
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
      alignItems: "center",
      justifyContent: "center",
    },
    photoMainBadge: {
      position: "absolute",
      top: theme.spacing.xs,
      left: theme.spacing.xs,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    photoMainText: {
      color: "#000000",
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
