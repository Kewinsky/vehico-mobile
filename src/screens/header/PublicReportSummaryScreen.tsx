import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Carousel from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../../types/domain";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import {
  generatePublicPageWithOptions,
  getPublicPageUrl,
  updatePublicReportTempPhotos,
} from "../../services/publicPages/publicPagesRepo";
import { uploadReportPhotos } from "../../services/publicPages/uploadReportPhoto";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { formatDateDisplay } from "../../utils/dateFormatting";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportSummary">;

function InfoCard({
  title,
  status,
  count,
  isLast = false,
  theme,
  styles,
}: {
  title: string;
  status: "included" | "notIncluded" | "noData";
  count?: number;
  isLast?: boolean;
  theme: any;
  styles: any;
}) {
  const { t } = useTranslation();
  const value =
    status === "included"
      ? count != null
        ? t("publicReport.includedWithCount", { count })
        : t("publicReport.included")
      : "—";
  const valueColor = value === "—" ? theme.colors.muted : theme.colors.accent;

  return (
    <View style={[styles.dataRow, isLast && styles.dataRowLast]}>
      <Text style={styles.dataLabel}>{title}</Text>
      <Text style={[styles.dataValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function PublicReportSummaryScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, reportOptions, selectedVehiclePhotoIds, tempPhotos } =
    route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";
  const distanceUnitLabel = distanceUnit === "miles" ? "mi" : "km";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const [photosCarouselWidth, setPhotosCarouselWidth] = useState(0);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<Map<string, string>>(
    new Map(),
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries, vehiclePhotos, tires, wheels] =
        await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehiclePhotos(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
        ]);
      setVehicle(v);
      setServiceEntriesCount(serviceEntries.length);
      setFuelingEntriesCount(fuelingEntries.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);

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

    // Check entitlements
    if (!isPremium) {
      navigation.navigate("Shop");
      return;
    }

    try {
      setGenerating(true);

      const report = await generatePublicPageWithOptions(
        vehicleId,
        selectedVehiclePhotoIds,
        [],
        reportOptions,
      );

      if (tempPhotos.length > 0) {
        const uploadedTempPhotos = await uploadReportPhotos({
          reportId: report.id,
          photos: tempPhotos,
        });
        await updatePublicReportTempPhotos(report.id, uploadedTempPhotos);
      }

      const url = await getPublicPageUrl(report.public_id);
      const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

      toastSuccess(t("publicReport.reportGenerated"));

      navigation.reset({
        index: 4,
        routes: [
          { name: "Vehicles" },
          { name: "VehicleDashboard", params: { vehicleId } },
          { name: "Share", params: { vehicleId } },
          { name: "PublicReport", params: { vehicleId } },
          {
            name: "PublicReportOptions",
            params: {
              url,
              vehicleTitle,
              vehicleId,
              reportTitle: report.title,
              generatedAt: `${t("share.generatedOn")} ${formatDateDisplay(report.created_at, i18n.language)}`,
            },
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
    selectedVehiclePhotoIds.forEach((id) => {
      const url = vehiclePhotoUrls.get(id);
      if (url) urls.push(url);
    });
    tempPhotos.forEach((photo) => urls.push(photo.fileUri));
    return urls;
  }, [selectedVehiclePhotoIds, vehiclePhotoUrls, tempPhotos]);

  const photoCount = allPhotoUrls.length;

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
      footer={
        <Button
          onPress={handleGenerateReport}
          disabled={!confirmed || generating || !isPremium}
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
              <Text
                style={{
                  color: "#000000",
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                {t("publicReport.generating")}
              </Text>
            </View>
          ) : (
            t("publicReport.generateReportButton")
          )}
        </Button>
      }
      title={t("publicReport.summaryTitle")}
    >
      {!loading && (
        <>
          {reportOptions.include_photos && photoCount > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {`${t("publicReport.photos")} (${photoIndex + 1}/${photoCount})`}
              </Text>
              <Pressable
                style={styles.photosWrap}
                onPress={() => setFullScreenIndex(photoIndex)}
                onLayout={(event) =>
                  setPhotosCarouselWidth(event.nativeEvent.layout.width)
                }
              >
                <Carousel
                  loop={true}
                  snapEnabled={true}
                  pagingEnabled={true}
                  data={allPhotoUrls}
                  width={photosCarouselWidth || windowWidth}
                  height={220}
                  onConfigurePanGesture={(pan) => {
                    pan.activeOffsetX([-12, 12]).failOffsetY([-15, 15]);
                  }}
                  onProgressChange={(_, absoluteProgress) => {
                    const rounded = Math.round(absoluteProgress);
                    const normalized =
                      ((rounded % photoCount) + photoCount) % photoCount;
                    setPhotoIndex(normalized);
                  }}
                  renderItem={({ item: url }) => (
                    <View style={styles.photoSlide}>
                      <Image
                        source={{ uri: url }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                  )}
                />
                {photoCount > 1 && (
                  <Pressable
                    style={styles.expandButton}
                    onPress={() => setFullScreenIndex(photoIndex)}
                    hitSlop={8}
                  >
                    <FontAwesome5
                      name="expand"
                      size={16}
                      color={theme.colors.accent}
                    />
                  </Pressable>
                )}
              </Pressable>
            </View>
          )}

          {/* Summary of technical data */}
          {reportOptions.include_technical_data && vehicle && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("publicReport.technicalData")}
              </Text>
              <View style={styles.sectionCard}>
                {(() => {
                  const dash = "—";
                  const val = (
                    v: string | number | null | undefined,
                    fallback: string,
                  ) =>
                    v != null && String(v).trim() !== ""
                      ? String(v).trim()
                      : fallback;
                  const typeVal =
                    vehicle.type === "car"
                      ? t("vehicleForm.car")
                      : t("vehicleForm.motorcycle");
                  const makeVal = val(vehicle.make, dash);
                  const modelVal = val(vehicle.model, dash);
                  const yearVal =
                    vehicle.production_year != null
                      ? String(vehicle.production_year)
                      : dash;
                  const vinVal = val(vehicle.vin, dash);
                  const firstRegVal = vehicle.first_registration_date
                    ? formatDateDisplay(
                        vehicle.first_registration_date,
                        i18n.language,
                      )
                    : dash;
                  const licenseVal = val(vehicle.license_plate, dash);
                  const mileageVal =
                    vehicle.mileage != null
                      ? `${vehicle.mileage.toLocaleString()} ${distanceUnitLabel}`
                      : dash;
                  const engineVal =
                    vehicle.engine_capacity != null
                      ? `${vehicle.engine_capacity} cm³`
                      : dash;
                  const powerVal =
                    vehicle.power_hp != null ? `${vehicle.power_hp} HP` : dash;
                  const transVal =
                    vehicle.transmission != null
                      ? vehicle.transmission === "manual"
                        ? t("vehicleForm.transmissionManual")
                        : t("vehicleForm.transmissionAutomatic")
                      : dash;
                  const driveVal = vehicle.drive_type ?? dash;
                  const fuelVal =
                    vehicle.fuel_type != null
                      ? t(
                          `vehicleForm.fuelType${
                            vehicle.fuel_type.charAt(0).toUpperCase() +
                            vehicle.fuel_type.slice(1)
                          }` as
                            | "vehicleForm.fuelTypePetrol"
                            | "vehicleForm.fuelTypeDiesel"
                            | "vehicleForm.fuelTypeHybrid"
                            | "vehicleForm.fuelTypeElectric"
                            | "vehicleForm.fuelTypeLpg",
                        )
                      : dash;
                  const valueColor = (v: string) =>
                    v === dash ? theme.colors.muted : theme.colors.accent;
                  return (
                    <>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.type")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: theme.colors.accent },
                          ]}
                        >
                          {typeVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.makeLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(makeVal) },
                          ]}
                        >
                          {makeVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.modelLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(modelVal) },
                          ]}
                        >
                          {modelVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.yearLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(yearVal) },
                          ]}
                        >
                          {yearVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.vinLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(vinVal) },
                          ]}
                        >
                          {vinVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.firstRegistrationDateLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(firstRegVal) },
                          ]}
                        >
                          {firstRegVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.licensePlateLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(licenseVal) },
                          ]}
                        >
                          {licenseVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.mileageLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(mileageVal) },
                          ]}
                        >
                          {mileageVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.engineCapacityLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(engineVal) },
                          ]}
                        >
                          {engineVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.powerHpLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(powerVal) },
                          ]}
                        >
                          {powerVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.transmissionLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(transVal) },
                          ]}
                        >
                          {transVal}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.driveTypeLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(driveVal) },
                          ]}
                        >
                          {driveVal}
                        </Text>
                      </View>
                      <View style={[styles.dataRow, styles.dataRowLast]}>
                        <Text style={styles.dataLabel}>
                          {t("vehicleForm.fuelTypeLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.dataValue,
                            { color: valueColor(fuelVal) },
                          ]}
                        >
                          {fuelVal}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            </View>
          )}

          {/* InfoCards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("publicReport.includedData")}
            </Text>
            <View style={styles.sectionCard}>
              <InfoCard
                title={t("publicReport.insurance")}
                status={
                  reportOptions.include_insurance
                    ? hasInsurance
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.inspection")}
                status={
                  reportOptions.include_inspection
                    ? hasInspection
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.notes")}
                status={
                  reportOptions.include_notes
                    ? hasNotes
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.wheels")}
                status={
                  reportOptions.include_wheels
                    ? wheelsCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.tires")}
                status={
                  reportOptions.include_tires
                    ? tiresCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.serviceHistory")}
                status={
                  reportOptions.include_service_history
                    ? serviceEntriesCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                count={
                  reportOptions.include_service_history &&
                  serviceEntriesCount > 0
                    ? serviceEntriesCount
                    : undefined
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.serviceStats")}
                status={
                  reportOptions.include_service_stats
                    ? serviceEntriesCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.fuelingStats")}
                status={
                  reportOptions.include_fueling_stats
                    ? fuelingEntriesCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                theme={theme}
                styles={styles}
              />
              <InfoCard
                title={t("publicReport.photos")}
                status={
                  reportOptions.include_photos
                    ? photoCount > 0
                      ? "included"
                      : "noData"
                    : "notIncluded"
                }
                count={
                  reportOptions.include_photos && photoCount > 0
                    ? photoCount
                    : undefined
                }
                theme={theme}
                styles={styles}
                isLast
              />
            </View>
          </View>

          {/* Entitlements info */}
          {!isPremium && (
            <View style={styles.section}>
              <View style={[styles.sectionCard, styles.limitInfo]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.limitText, { color: theme.colors.muted }]}>
                  {t("limits.premiumRequiredBody")}
                </Text>
              </View>
            </View>
          )}

          {/* Confirmation Checkbox */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Pressable
                onPress={() => setConfirmed(!confirmed)}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={confirmed ? "checkbox" : "square-outline"}
                  size={26}
                  color={confirmed ? theme.colors.accent : theme.colors.muted}
                />
                <Text style={styles.checkboxLabel}>
                  {t("publicReport.confirmationCheckbox")}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
      <Modal
        visible={fullScreenIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenIndex(null)}
      >
        <View style={styles.fullScreenOverlay}>
          <Pressable
            style={[styles.fullScreenClose, { top: insets.top + 8 }]}
            onPress={() => setFullScreenIndex(null)}
            hitSlop={12}
          >
            <Ionicons
              name="close"
              size={28}
              color="#FFFFFF"
            />
          </Pressable>
          {fullScreenIndex !== null && allPhotoUrls.length > 0 && (
            <FlatList
              data={allPhotoUrls}
              horizontal
              pagingEnabled
              initialScrollIndex={fullScreenIndex}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(url, idx) => `${url}-${idx}`}
              renderItem={({ item: url }) => (
                <View style={{ width: windowWidth, height: windowHeight }}>
                  <Image
                    source={{ uri: url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.spacing.md,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    photosWrap: {
      width: "100%",
      position: "relative",
      height: 220,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
    },
    photoSlide: {
      width: "100%",
      height: "100%",
      overflow: "hidden",
      backgroundColor: theme.colors.bg,
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    expandButton: {
      position: "absolute",
      bottom: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: theme.spacing.md,
      zIndex: 10,
      width: theme.spacing.xl + theme.spacing.lg,
      height: theme.spacing.xl + theme.spacing.lg,
      borderRadius: (theme.spacing.xl + theme.spacing.lg) / 2,
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
    dataRowLast: {
      borderBottomWidth: 0,
    },
    dataLabel: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
    dataValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.fg,
    },
    limitInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
    },
    limitText: {
      fontSize: theme.typography.small,
      flex: 1,
    },
  });
