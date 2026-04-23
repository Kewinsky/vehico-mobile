import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { DraggableGrid } from "react-native-draggable-grid";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import type { Vehicle, VehiclePhoto } from "../../types/domain";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";

const MAX_PHOTOS = 40;

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportConfigure">;

type PhotoItem = {
  key: string;
  photoId?: string;
  tempId?: string;
  url: string;
  isVehiclePhoto: boolean;
  displayOrder: number;
};

export function PublicReportConfigureScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [fuelingCount, setFuelingCount] = useState(0);
  const [serviceEntriesCount, setServiceEntriesCount] = useState(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;
  const hasWheels = wheelsCount > 0;
  const hasTires = tiresCount > 0;
  const hasServiceHistory = serviceEntriesCount > 0;
  const hasServiceStats = serviceEntriesCount > 0;
  const hasFuelingStats = fuelingCount > 0;

  const [includeTechnicalData] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [includeInspection, setIncludeInspection] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeWheels, setIncludeWheels] = useState(false);
  const [includeTires, setIncludeTires] = useState(false);
  const [includeServiceHistory, setIncludeServiceHistory] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeFuelingStats, setIncludeFuelingStats] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);

  const [selectedVehiclePhotoIds, setSelectedVehiclePhotoIds] = useState<
    Set<string>
  >(new Set());
  const [tempPhotos, setTempPhotos] = useState<
    Array<{
      id: string;
      fileUri: string;
      displayOrder: number;
      mimeType?: string | null;
      fileName?: string | null;
    }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, photos, fuelings, serviceEntries, tires, wheels] =
        await Promise.all([
          getVehicle(vehicleId),
          listVehiclePhotos(vehicleId),
          listFuelingEntries(vehicleId),
          listServiceEntries(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
        ]);
      setVehicle(v);
      setVehiclePhotos(photos);
      setFuelingCount(fuelings.length);
      setServiceEntriesCount(serviceEntries.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);
      setSelectedVehiclePhotoIds(new Set(photos.map((p) => p.id)));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const allPhotos: PhotoItem[] = useMemo(() => {
    const items: PhotoItem[] = [];
    vehiclePhotos
      .filter((p) => selectedVehiclePhotoIds.has(p.id))
      .forEach((photo) => {
        items.push({
          key: `vehicle-${photo.id}`,
          photoId: photo.id,
          url: getVehiclePhotoUrl(photo),
          isVehiclePhoto: true,
          displayOrder: photo.display_order,
        });
      });
    tempPhotos.forEach((photo) => {
      items.push({
        key: `temp-${photo.id}`,
        tempId: photo.id,
        url: photo.fileUri,
        isVehiclePhoto: false,
        displayOrder: photo.displayOrder,
      });
    });
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [vehiclePhotos, selectedVehiclePhotoIds, tempPhotos]);

  const totalPhotoCount = allPhotos.length;

  const unavailableOptions = useMemo(() => {
    const list: string[] = [];
    if (!hasInsurance) list.push(t("publicReport.optionInsurance"));
    if (!hasInspection) list.push(t("publicReport.optionInspection"));
    if (!hasNotes) list.push(t("publicReport.notes"));
    if (!hasWheels) list.push(t("publicReport.optionWheels"));
    if (!hasTires) list.push(t("publicReport.optionTires"));
    if (!hasServiceHistory) list.push(t("publicReport.optionServiceHistory"));
    if (!hasFuelingStats) list.push(t("publicReport.optionFuelingStats"));
    return list;
  }, [
    hasInsurance,
    hasInspection,
    hasNotes,
    hasWheels,
    hasTires,
    hasServiceHistory,
    hasFuelingStats,
    t,
  ]);

  async function pickFromGallery() {
    try {
      const remainingSlots = MAX_PHOTOS - totalPhotoCount;
      if (remainingSlots <= 0) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
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
        .map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random()}`,
          fileUri: asset.uri,
          displayOrder: totalPhotoCount + index,
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
        }));
      setTempPhotos([...tempPhotos, ...newPhotos]);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function removeTempPhoto(id: string) {
    setTempPhotos(tempPhotos.filter((p) => p.id !== id));
  }

  function toggleVehiclePhoto(photoId: string) {
    const newSet = new Set(selectedVehiclePhotoIds);
    if (newSet.has(photoId)) {
      newSet.delete(photoId);
    } else {
      if (totalPhotoCount >= MAX_PHOTOS) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      newSet.add(photoId);
    }
    setSelectedVehiclePhotoIds(newSet);
  }

  function handleDragRelease(data: PhotoItem[]) {
    setIsDragging(false);
    const vehiclePhotoMap = new Map(vehiclePhotos.map((p) => [p.id, p]));
    const tempPhotoMap = new Map(tempPhotos.map((p) => [p.id, p]));
    const newVehiclePhotos = [...vehiclePhotos];
    const newTempPhotos = [...tempPhotos];
    data.forEach((item, index) => {
      if (item.isVehiclePhoto && item.photoId) {
        const photo = vehiclePhotoMap.get(item.photoId);
        if (photo) {
          const idx = newVehiclePhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0)
            newVehiclePhotos[idx] = { ...photo, display_order: index };
        }
      } else if (!item.isVehiclePhoto && item.tempId) {
        const photo = tempPhotoMap.get(item.tempId);
        if (photo) {
          const idx = newTempPhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) newTempPhotos[idx] = { ...photo, displayOrder: index };
        }
      }
    });
    setVehiclePhotos(newVehiclePhotos);
    setTempPhotos(newTempPhotos);
  }

  const renderPhotoItem = (item: PhotoItem) => (
    <View style={styles.photoCard}>
      <View style={styles.photoImageContainer}>
        <Image
          source={{ uri: item.url }}
          style={styles.photoImage}
          contentFit="cover"
          transition={200}
        />
        <Pressable
          onPress={() =>
            item.isVehiclePhoto
              ? item.photoId && toggleVehiclePhoto(item.photoId)
              : item.tempId && removeTempPhoto(item.tempId)
          }
          style={styles.photoCloseButton}
          hitSlop={5}
        >
          <Ionicons name="close-circle" size={28} color={theme.colors.accent} />
        </Pressable>
      </View>
    </View>
  );

  function handleNext() {
    navigation.navigate("PublicReportSummary", {
      vehicleId,
      reportOptions: {
        include_technical_data: includeTechnicalData,
        include_insurance: includeInsurance,
        include_inspection: includeInspection,
        include_notes: includeNotes,
        include_wheels: includeWheels,
        include_tires: includeTires,
        include_service_history: includeServiceHistory,
        include_service_stats: includeServiceStats,
        include_fueling_stats: includeFuelingStats,
        include_photos: includePhotos,
      },
      selectedVehiclePhotoIds: includePhotos
        ? Array.from(selectedVehiclePhotoIds)
        : [],
      tempPhotos: includePhotos
        ? tempPhotos.map((p) => ({
            fileUri: p.fileUri,
            displayOrder: p.displayOrder,
            mimeType: p.mimeType,
            fileName: p.fileName,
          }))
        : [],
    });
  }

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  const CheckboxRow = ({
    label,
    checked,
    onPress,
    disabled,
    suffix,
  }: {
    label: string;
    checked: boolean;
    onPress: () => void;
    disabled?: boolean;
    suffix?: string;
  }) => (
    <Pressable
      style={[styles.checkboxRow, disabled && styles.checkboxRowDisabled]}
      onPress={() => !disabled && onPress()}
      disabled={disabled}
    >
      <Text
        style={[styles.optionLabel, disabled && { color: theme.colors.muted }]}
      >
        {label}
        {suffix ? ` ${suffix}` : ""}
      </Text>
      <Ionicons
        name={checked ? "checkbox" : "checkbox-outline"}
        size={24}
        color={
          disabled
            ? theme.colors.muted
            : checked
              ? theme.colors.accent
              : theme.colors.muted
        }
      />
    </Pressable>
  );

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
      footer={
        <Button onPress={handleNext}>{t("publicReport.nextButton")}</Button>
      }
      title={t("publicReport.configureTitle")}
      scrollEnabled={!isDragging}
    >
      {unavailableOptions.length > 0 && (
        <View style={[styles.section, styles.hintSection]}>
          <Text style={styles.hintText}>
            {t("publicReport.unavailableOptionsHint", {
              list: unavailableOptions.join(", "),
            })}
          </Text>
        </View>
      )}
      <View>
        <CheckboxRow
          label={t("publicReport.optionInsurance")}
          checked={includeInsurance}
          onPress={() => setIncludeInsurance(!includeInsurance)}
          disabled={!hasInsurance}
          suffix={!hasInsurance ? `(${t("publicReport.noData")})` : undefined}
        />
        <CheckboxRow
          label={t("publicReport.optionInspection")}
          checked={includeInspection}
          onPress={() => setIncludeInspection(!includeInspection)}
          disabled={!hasInspection}
          suffix={!hasInspection ? `(${t("publicReport.noData")})` : undefined}
        />
        <CheckboxRow
          label={t("publicReport.optionNotes", { vehicleTitle })}
          checked={includeNotes}
          onPress={() => setIncludeNotes(!includeNotes)}
          disabled={!hasNotes}
          suffix={!hasNotes ? `(${t("publicReport.noData")})` : undefined}
        />
        <CheckboxRow
          label={t("publicReport.optionWheels")}
          checked={includeWheels}
          onPress={() => setIncludeWheels(!includeWheels)}
          disabled={!hasWheels}
          suffix={!hasWheels ? `(${t("publicReport.noData")})` : undefined}
        />
        <CheckboxRow
          label={t("publicReport.optionTires")}
          checked={includeTires}
          onPress={() => setIncludeTires(!includeTires)}
          disabled={!hasTires}
          suffix={!hasTires ? `(${t("publicReport.noData")})` : undefined}
        />
        <CheckboxRow
          label={t("publicReport.optionServiceHistory")}
          checked={includeServiceHistory}
          onPress={() => setIncludeServiceHistory(!includeServiceHistory)}
          disabled={!hasServiceHistory}
          suffix={
            hasServiceHistory
              ? t("publicReport.optionServiceHistoryEntries", {
                  count: serviceEntriesCount,
                })
              : t("publicReport.optionServiceHistoryNoData")
          }
        />
        <CheckboxRow
          label={t("publicReport.optionServiceStats")}
          checked={includeServiceStats}
          onPress={() => setIncludeServiceStats(!includeServiceStats)}
          disabled={!hasServiceStats}
          suffix={
            !hasServiceStats ? `(${t("publicReport.noData")})` : undefined
          }
        />
        <CheckboxRow
          label={t("publicReport.optionFuelingStats")}
          checked={includeFuelingStats}
          onPress={() => setIncludeFuelingStats(!includeFuelingStats)}
          disabled={!hasFuelingStats}
          suffix={
            !hasFuelingStats ? `(${t("publicReport.noData")})` : undefined
          }
        />
        <CheckboxRow
          label={t("publicReport.optionPhotos")}
          checked={includePhotos}
          onPress={() => setIncludePhotos(!includePhotos)}
          suffix={
            includePhotos && totalPhotoCount > 0
              ? t("publicReport.optionPhotosCount", {
                  count: totalPhotoCount,
                })
              : undefined
          }
        />
      </View>

      {includePhotos && (
        <View style={styles.section}>
          <View style={styles.photosHeader}>
            <Text style={styles.sectionTitle}>
              {t("publicReport.photosSection")}
            </Text>
            <Text style={styles.photosCount}>
              {t("publicReport.photosCount", {
                count: totalPhotoCount,
              })}
            </Text>
          </View>
          {vehiclePhotos.length > 0 && (
            <>
              <Text style={styles.photosSubtitle}>
                {t("publicReport.photosFromApp")}
              </Text>
              <View style={styles.vehiclePhotosList}>
                {vehiclePhotos.map((photo) => {
                  const isSelected = selectedVehiclePhotoIds.has(photo.id);
                  return (
                    <Pressable
                      key={photo.id}
                      onPress={() => toggleVehiclePhoto(photo.id)}
                      style={[
                        styles.vehiclePhotoItem,
                        isSelected && styles.vehiclePhotoItemSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: getVehiclePhotoUrl(photo) }}
                        style={styles.vehiclePhotoThumbnail}
                        contentFit="cover"
                      />
                      <View style={styles.vehiclePhotoCheckbox}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "checkbox-outline"}
                          size={26}
                          color={
                            isSelected
                              ? theme.colors.accent
                              : theme.colors.muted
                          }
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {allPhotos.length > 0 && (
            <DraggableGrid
              numColumns={3}
              renderItem={renderPhotoItem}
              data={allPhotos}
              onDragStart={() => setIsDragging(true)}
              onDragRelease={handleDragRelease}
            />
          )}
          {totalPhotoCount < MAX_PHOTOS && (
            <View style={styles.addPhotoButtons}>
              <Button
                onPress={pickFromGallery}
                variant="ghost"
                style={styles.addPhotoButton}
              >
                {t("publicReport.addPhotos")}
              </Button>
            </View>
          )}
        </View>
      )}
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    header: { gap: theme.spacing.xs / 2, marginBottom: theme.spacing.md },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    section: { marginBottom: theme.spacing.md },
    hintSection: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    hintText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    checkboxRowDisabled: { opacity: 0.7 },
    optionLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
    photosHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    photosCount: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.accent,
    },
    photosSubtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm,
    },
    vehiclePhotosList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    vehiclePhotoItem: {
      width: theme.spacing.xl * 2 + theme.spacing.sm,
      height: theme.spacing.xl * 2 + theme.spacing.sm,
      borderRadius: theme.radius.sm,
      overflow: "hidden",
      position: "relative",
    },
    vehiclePhotoItemSelected: { borderColor: theme.colors.accent },
    vehiclePhotoThumbnail: { width: "100%", height: "100%" },
    vehiclePhotoCheckbox: {
      position: "absolute",
      top: 4,
      right: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    photoCard: { margin: theme.spacing.xs },
    photoImageContainer: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: theme.radius.sm,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      position: "relative",
    },
    photoImage: { width: "100%", height: "100%" },
    photoCloseButton: {
      position: "absolute",
      top: 4,
      right: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    addPhotoButtons: { marginTop: theme.spacing.sm / 2 },
    addPhotoButton: { marginBottom: theme.spacing.xs },
  });
