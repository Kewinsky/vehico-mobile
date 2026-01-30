import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { DraggableGrid } from "react-native-draggable-grid";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import type { VehiclePhoto } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

const MAX_PHOTOS = 30;

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportConfigure">;

type PhotoItem = {
  key: string;
  photoId?: string; // For vehicle photos
  tempId?: string; // For temp photos
  url: string;
  isVehiclePhoto: boolean;
  displayOrder: number;
};

export function PublicReportConfigureScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Report options - order: service entries, fueling stats, service stats, wheels, notes
  const [includeServiceEntries] = useState(true); // Always true, mandatory
  const [includeFueling, setIncludeFueling] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeWheelsTires, setIncludeWheelsTires] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  // Selected vehicle photo IDs
  const [selectedVehiclePhotoIds, setSelectedVehiclePhotoIds] = useState<
    Set<string>
  >(new Set());

  // Temp photos (not yet uploaded, stored locally)
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
      const [v, photos] = await Promise.all([
        getVehicle(vehicleId),
        listVehiclePhotos(vehicleId),
      ]);
      setVehicle(v);
      setVehiclePhotos(photos);
      // Select all vehicle photos by default
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

  // Combine all photos for display
  const allPhotos: PhotoItem[] = useMemo(() => {
    const items: PhotoItem[] = [];

    // Vehicle photos (selected ones)
    vehiclePhotos
      .filter((p) => selectedVehiclePhotoIds.has(p.id))
      .forEach((photo, index) => {
        items.push({
          key: `vehicle-${photo.id}`,
          photoId: photo.id,
          url: getVehiclePhotoUrl(photo),
          isVehiclePhoto: true,
          displayOrder: photo.display_order,
        });
      });

    // Temp photos
    tempPhotos.forEach((photo) => {
      items.push({
        key: `temp-${photo.id}`,
        tempId: photo.id,
        url: photo.fileUri,
        isVehiclePhoto: false,
        displayOrder: photo.displayOrder,
      });
    });

    // Sort by display order
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [vehiclePhotos, selectedVehiclePhotoIds, tempPhotos]);

  const totalPhotoCount = allPhotos.length;

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

      // Add temp photos
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

  async function pickFromCamera() {
    try {
      const remainingSlots = MAX_PHOTOS - totalPhotoCount;
      if (remainingSlots <= 0) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));

      const newPhoto = {
        id: `${Date.now()}-${Math.random()}`,
        fileUri: asset.uri,
        displayOrder: totalPhotoCount,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      };

      setTempPhotos([...tempPhotos, newPhoto]);
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

    // Update display orders
    const vehiclePhotoMap = new Map(vehiclePhotos.map((p) => [p.id, p]));
    const tempPhotoMap = new Map(tempPhotos.map((p) => [p.id, p]));

    // Update vehicle photos display_order (we'll need to update in DB later, but for now just reorder locally)
    const newVehiclePhotos = [...vehiclePhotos];
    const newTempPhotos = [...tempPhotos];

    data.forEach((item, index) => {
      if (item.isVehiclePhoto && item.photoId) {
        const photo = vehiclePhotoMap.get(item.photoId);
        if (photo) {
          const idx = newVehiclePhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) {
            newVehiclePhotos[idx] = { ...photo, display_order: index };
          }
        }
      } else if (!item.isVehiclePhoto && item.tempId) {
        const photo = tempPhotoMap.get(item.tempId);
        if (photo) {
          const idx = newTempPhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) {
            newTempPhotos[idx] = { ...photo, displayOrder: index };
          }
        }
      }
    });

    setVehiclePhotos(newVehiclePhotos);
    setTempPhotos(newTempPhotos);
  }

  const renderPhotoItem = (item: PhotoItem) => {
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoImageContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.photoImage}
            contentFit="cover"
            transition={200}
          />
          {item.isVehiclePhoto && (
            <View style={styles.photoCheckboxContainer}>
              <Pressable
                onPress={() => item.photoId && toggleVehiclePhoto(item.photoId)}
                style={[
                  styles.photoCheckbox,
                  selectedVehiclePhotoIds.has(item.photoId || "") &&
                    styles.photoCheckboxChecked,
                ]}
              >
                {selectedVehiclePhotoIds.has(item.photoId || "") && (
                  <Ionicons name="checkmark" size={16} color="#000000" />
                )}
              </Pressable>
            </View>
          )}
          {!item.isVehiclePhoto && (
            <Pressable
              onPress={() => item.tempId && removeTempPhoto(item.tempId)}
              style={styles.photoDeleteButton}
              hitSlop={5}
            >
              <Ionicons name="close" size={16} color={theme.colors.fg} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  function handleNext() {
    // Prepare data for summary screen
    navigation.navigate("PublicReportSummary", {
      vehicleId,
      reportOptions: {
        include_service_entries: includeServiceEntries,
        include_fueling_stats: includeFueling,
        include_service_stats: includeServiceStats,
        include_wheels_tires: includeWheelsTires,
        include_notes: includeNotes,
      },
      selectedVehiclePhotoIds: Array.from(selectedVehiclePhotoIds),
      tempPhotos: tempPhotos.map((p) => ({
        fileUri: p.fileUri,
        displayOrder: p.displayOrder,
        mimeType: p.mimeType,
        fileName: p.fileName,
      })),
    });
  }

  const canProceed = totalPhotoCount > 0;

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isDragging}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>{t("publicReport.configureTitle")}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : (
          <>
            {/* Report Options - checkboxes: 1.Wpisy 2.Statystyki tankowań 3.Statystyki serwisowania 4.Felgi 5.Notatki */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("publicReport.vehicleInfo")}
              </Text>
              {/* 1. Wpisy serwisowe - always checked */}
              <Pressable style={styles.checkboxRow} onPress={() => {}} disabled>
                <View
                  style={[
                    styles.optionCheckbox,
                    styles.optionCheckboxChecked,
                    styles.optionCheckboxDisabled,
                  ]}
                >
                  <Ionicons name="checkmark" size={16} color="#000000" />
                </View>
                <Text style={styles.optionLabel}>
                  {t("marketplace.serviceEntries")}
                </Text>
              </Pressable>

              {/* 2. Notatki */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIncludeNotes(!includeNotes)}
              >
                <View
                  style={[
                    styles.optionCheckbox,
                    includeNotes && styles.optionCheckboxChecked,
                  ]}
                >
                  {includeNotes && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </View>
                <Text style={styles.optionLabel}>{t("marketplace.notes")}</Text>
              </Pressable>
              {/* 3. Statystyki tankowań - raw fuelings passed, calculated on web */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIncludeFueling(!includeFueling)}
              >
                <View
                  style={[
                    styles.optionCheckbox,
                    includeFueling && styles.optionCheckboxChecked,
                  ]}
                >
                  {includeFueling && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </View>
                <Text style={styles.optionLabel}>
                  {t("marketplace.fuelingStats")}
                </Text>
              </Pressable>
              {/* 4. Statystyki serwisowania - Eksploatacja + wydatki wg kategorii */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIncludeServiceStats(!includeServiceStats)}
              >
                <View
                  style={[
                    styles.optionCheckbox,
                    includeServiceStats && styles.optionCheckboxChecked,
                  ]}
                >
                  {includeServiceStats && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </View>
                <Text style={styles.optionLabel}>
                  {t("marketplace.serviceStats")}
                </Text>
              </Pressable>
              {/* 5. Felgi i opony */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIncludeWheelsTires(!includeWheelsTires)}
              >
                <View
                  style={[
                    styles.optionCheckbox,
                    includeWheelsTires && styles.optionCheckboxChecked,
                  ]}
                >
                  {includeWheelsTires && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </View>
                <Text style={styles.optionLabel}>
                  {t("marketplace.wheelsAndTires")}
                </Text>
              </Pressable>
            </View>

            {/* Photos Section */}
            <View style={styles.section}>
              <View style={styles.photosHeader}>
                <Text style={styles.sectionTitle}>
                  {t("publicReport.photosSection")}
                </Text>
                <Text style={styles.photosCount}>
                  {t("publicReport.photosCount", { count: totalPhotoCount })}
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
                          <View
                            style={[
                              styles.vehiclePhotoCheckbox,
                              isSelected && styles.vehiclePhotoCheckboxChecked,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#000000"
                              />
                            )}
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
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={handleNext} disabled={!canProceed}>
          {t("publicReport.nextButton")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.spacing.md,
    },
    h1: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    optionCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionCheckboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    optionCheckboxDisabled: {
      opacity: 0.8,
    },
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
      fontWeight: "600",
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
      borderWidth: 2,
      borderColor: theme.colors.border,
      position: "relative",
    },
    vehiclePhotoItemSelected: {
      borderColor: theme.colors.accent,
    },
    vehiclePhotoThumbnail: {
      width: "100%",
      height: "100%",
    },
    vehiclePhotoCheckbox: {
      position: "absolute",
      top: theme.spacing.xs / 2,
      right: theme.spacing.xs / 2,
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    vehiclePhotoCheckboxChecked: {
      backgroundColor: theme.colors.accent,
    },
    photoCard: {
      margin: theme.spacing.xs,
    },
    photoImageContainer: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: theme.radius.sm,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      position: "relative",
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    photoCheckboxContainer: {
      position: "absolute",
      top: theme.spacing.xs / 2,
      right: theme.spacing.xs / 2,
    },
    photoCheckbox: {
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoCheckboxChecked: {
      backgroundColor: theme.colors.accent,
    },
    photoDeleteButton: {
      position: "absolute",
      top: theme.spacing.xs / 2,
      right: theme.spacing.xs / 2,
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    addPhotoButtons: {
      marginTop: theme.spacing.md,
    },
    addPhotoButton: {
      marginBottom: theme.spacing.xs,
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
  });
