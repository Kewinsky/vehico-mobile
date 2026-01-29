import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import {
  generatePublicPageWithOptions,
  getPublicPageUrl,
} from "../services/publicPages/publicPagesRepo";
import {
  uploadReportPhotos,
  type TempReportPhoto,
} from "../services/publicPages/uploadReportPhoto";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportSummary">;

export function PublicReportSummaryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, reportOptions, selectedVehiclePhotoIds, tempPhotos } =
    route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<
    number | null
  >(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<Map<string, string>>(
    new Map(),
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries, vehiclePhotos] =
        await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehiclePhotos(vehicleId),
        ]);
      setVehicle(v);
      setServiceEntriesCount(serviceEntries.length);
      setFuelingEntriesCount(fuelingEntries.length);

      // Build photo URL map for selected photos
      const urlMap = new Map<string, string>();
      vehiclePhotos
        .filter((p) => selectedVehiclePhotoIds.includes(p.id))
        .forEach((photo) => {
          urlMap.set(photo.id, getVehiclePhotoUrl(photo));
        });
      setVehiclePhotoUrls(urlMap);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, selectedVehiclePhotoIds, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerateReport() {
    if (!confirmed) {
      toastError(t("publicReport.confirmationRequired"));
      return;
    }

    try {
      setGenerating(true);

      // Step 1: Create report first to get the report ID
      // We'll create it with empty temp photos, then upload photos and update
      const report = await generatePublicPageWithOptions(
        vehicleId,
        selectedVehiclePhotoIds,
        [], // Empty temp photos for now - we'll add them after upload
        reportOptions,
      );

      // Step 2: Upload temp photos using the report ID
      let uploadedTempPhotos: TempReportPhoto[] = [];
      if (tempPhotos.length > 0) {
        uploadedTempPhotos = await uploadReportPhotos({
          reportId: report.id,
          photos: tempPhotos,
        });
      }

      const url = await getPublicPageUrl(report.public_id);
      const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

      toastSuccess(t("publicReport.reportGenerated"));

      navigation.reset({
        index: 1,
        routes: [
          {
            name: "PublicReport",
            params: { vehicleId },
          },
          {
            name: "PublicReportOptions",
            params: { url, vehicleTitle, vehicleId, reportTitle: report.title },
          },
        ],
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  const allPhotoUrls = useMemo(() => {
    const urls: string[] = [];
    // Vehicle photos
    selectedVehiclePhotoIds.forEach((id) => {
      const url = vehiclePhotoUrls.get(id);
      if (url) urls.push(url);
    });
    // Temp photos (local URIs)
    tempPhotos.forEach((photo) => {
      urls.push(photo.fileUri);
    });
    return urls;
  }, [selectedVehiclePhotoIds, vehiclePhotoUrls, tempPhotos]);

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>{t("publicReport.summaryTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("publicReport.summarySubtitle")}
          </Text>
        </View>

        {/* Technical Data */}
        {vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("publicReport.technicalData")}
            </Text>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t("vehicleForm.type")}</Text>
              <Text style={styles.dataValue}>
                {vehicle.type === "car"
                  ? t("vehicleForm.car")
                  : t("vehicleForm.motorcycle")}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t("vehicleForm.makeLabel")}</Text>
              <Text style={styles.dataValue}>{vehicle.make}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>
                {t("vehicleForm.modelLabel")}
              </Text>
              <Text style={styles.dataValue}>{vehicle.model}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t("vehicleForm.yearLabel")}</Text>
              <Text style={styles.dataValue}>{vehicle.production_year}</Text>
            </View>
            {vehicle.vin && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.vinLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.vin}</Text>
              </View>
            )}
            {vehicle.mileage !== null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.mileageLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {vehicle.mileage.toLocaleString()} {distanceUnit}
                </Text>
              </View>
            )}
            {vehicle.engine_capacity !== null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.engineCapacityLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {vehicle.engine_capacity} cm³
                </Text>
              </View>
            )}
            {vehicle.power_hp !== null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.powerHpLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.power_hp} HP</Text>
              </View>
            )}
            {vehicle.fuel_type && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.fuelTypeLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {t(
                    `vehicleForm.fuelType${
                      vehicle.fuel_type.charAt(0).toUpperCase() +
                      vehicle.fuel_type.slice(1)
                    }` as
                      | "vehicleForm.fuelTypePetrol"
                      | "vehicleForm.fuelTypeDiesel"
                      | "vehicleForm.fuelTypeHybrid"
                      | "vehicleForm.fuelTypeElectric"
                      | "vehicleForm.fuelTypeLpg",
                  )}
                </Text>
              </View>
            )}
            {vehicle.transmission && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.transmissionLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {vehicle.transmission === "manual"
                    ? t("vehicleForm.transmissionManual")
                    : t("vehicleForm.transmissionAutomatic")}
                </Text>
              </View>
            )}
            {vehicle.drive_type && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.driveTypeLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.drive_type}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {reportOptions.include_notes && vehicle?.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("publicReport.notes")}</Text>
            <Text style={styles.notesText}>{vehicle.notes}</Text>
          </View>
        )}

        {/* Service Entries */}
        {reportOptions.include_service_entries && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("publicReport.serviceEntriesCount")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("publicReport.serviceEntriesCount"),
                    t("publicReport.dataUsedForCharts"),
                  )
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.muted}
                />
              </Pressable>
            </View>
            <Text style={styles.countValue}>{serviceEntriesCount}</Text>
          </View>
        )}

        {/* Fueling Entries */}
        {reportOptions.include_fueling_stats && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("publicReport.fuelingEntriesCount")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("publicReport.fuelingEntriesCount"),
                    t("publicReport.dataUsedForCharts"),
                  )
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.muted}
                />
              </Pressable>
            </View>
            <Text style={styles.countValue}>{fuelingEntriesCount}</Text>
          </View>
        )}

        {/* Photos - title, count, preview button */}
        {allPhotoUrls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.photosSectionContent}>
              <View style={styles.photosSectionLeft}>
                <Text style={styles.sectionTitle}>
                  {t("publicReport.photosPreview")}
                </Text>
                <Text style={styles.countValue}>{allPhotoUrls.length}</Text>
              </View>
              <Pressable
                style={styles.previewButton}
                onPress={() => setFullScreenPhotoIndex(0)}
              >
                <Text style={styles.previewButtonText}>
                  {t("publicReport.photosPreviewButton")}
                </Text>
                <Ionicons
                  name="expand-outline"
                  size={18}
                  color={theme.colors.accent}
                />
              </Pressable>
            </View>
          </View>
        )}

        {/* Confirmation Checkbox */}
        <View style={styles.section}>
          <Pressable
            onPress={() => setConfirmed(!confirmed)}
            style={styles.checkboxRow}
          >
            <View
              style={[styles.checkbox, confirmed && styles.checkboxChecked]}
            >
              {confirmed && (
                <Ionicons name="checkmark" size={16} color="#000000" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              {t("publicReport.confirmationCheckbox")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Full-screen photo modal */}
      <Modal
        visible={fullScreenPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenPhotoIndex(null)}
      >
        <View
          style={[
            styles.fullScreenOverlay,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <Pressable
            style={[styles.fullScreenClose, { top: insets.top + 8 }]}
            onPress={() => setFullScreenPhotoIndex(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {fullScreenPhotoIndex !== null && allPhotoUrls.length > 0 && (
            <FlatList
              data={allPhotoUrls}
              horizontal
              pagingEnabled
              initialScrollIndex={fullScreenPhotoIndex}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(url) => url}
              renderItem={({ item: url }) => (
                <View
                  style={{
                    width: windowWidth,
                    height: windowHeight - insets.top - insets.bottom,
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={{ uri: url }}
                    style={{
                      width: windowWidth,
                      height: windowHeight - insets.top - insets.bottom,
                    }}
                    contentFit="contain"
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      <View style={styles.footer}>
        <Button
          onPress={handleGenerateReport}
          disabled={!confirmed || generating}
        >
          {generating ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <ActivityIndicator size="small" color="#000000" />
              <Text style={{ color: "#000000", fontWeight: "700" }}>
                {t("publicReport.generating")}
              </Text>
            </View>
          ) : (
            t("publicReport.generateReportButton")
          )}
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
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.muted,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    sectionTitleInRow: {
      marginBottom: 0,
    },
    countRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    countRowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    photosSectionContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    photosSectionLeft: {
      flex: 1,
    },
    previewButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    previewButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.accent,
    },
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: 16,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    dataRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dataLabel: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    dataValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    countValue: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.accent,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.fg,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.fg,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.accent,
    },
    photosGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    photoThumbnail: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    morePhotosText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.fg,
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
  });
