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
import type { Vehicle, VehiclePhoto } from "../../types/domain";
import { hasEnoughStatsEntries } from "../../types/reportOptions";
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
  updatePublicReportPhotos,
} from "../../services/publicPages/publicPagesRepo";
import { uploadAllReportPhotos } from "../../services/publicPages/uploadReportPhoto";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastCaughtError, toastError, toastSuccess } from "../../ui/toast/toast";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { ReportOptionsCard } from "../../ui/components/common/ReportOptionsCard";
import { ReportSummaryOptionGroup } from "../../ui/components/common/ReportSummaryOptionGroup";
import { ReportSummaryOptionRow } from "../../ui/components/common/ReportSummaryOptionRow";
import { reportSummaryStatus } from "../../ui/components/common/reportSummaryUtils";
import { VehicleTechnicalDataSummary } from "../../ui/components/common/VehicleTechnicalDataSummary";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportSummary">;

export function PublicReportSummaryScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, reportOptions, reportPhotos } = route.params;

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

  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<Map<string, string>>(
    new Map(),
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries, photos, tires, wheels] =
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
      setVehiclePhotos(photos);

      const selectedIds = new Set(
        reportPhotos
          .filter((p) => p.kind === "vehicle" && p.vehiclePhotoId)
          .map((p) => p.vehiclePhotoId as string),
      );
      const urlMap = new Map<string, string>();
      photos
        .filter((p) => selectedIds.has(p.id))
        .forEach((photo) => {
          urlMap.set(photo.id, getVehiclePhotoUrl(photo));
        });
      setVehiclePhotoUrls(urlMap);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, reportPhotos, t]);

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
        reportOptions,
      );

      if (reportOptions.include_photos && reportPhotos.length > 0) {
        const photoById = new Map(vehiclePhotos.map((p) => [p.id, p]));
        const uploadedPhotos = await uploadAllReportPhotos({
          reportId: report.id,
          items: reportPhotos.map((item) => {
            if (item.kind === "vehicle" && item.vehiclePhotoId) {
              const vehiclePhoto = photoById.get(item.vehiclePhotoId);
              if (!vehiclePhoto) {
                throw new Error(t("attachments.noFileSelected"));
              }
              return {
                kind: "vehicle" as const,
                vehiclePhoto,
                displayOrder: item.displayOrder,
              };
            }
            if (!item.fileUri) {
              throw new Error(t("attachments.noFileSelected"));
            }
            return {
              kind: "local" as const,
              fileUri: item.fileUri,
              displayOrder: item.displayOrder,
              mimeType: item.mimeType,
              fileName: item.fileName,
            };
          }),
        });
        await updatePublicReportPhotos(report.id, uploadedPhotos);
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
              generatedAt: `${t("share.generatedOn")} ${formatShortDisplayDate(report.created_at, i18n.language)}`,
            },
          },
        ],
      });
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  const allPhotoUrls = useMemo(() => {
    const sorted = [...reportPhotos].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    return sorted
      .map((item) => {
        if (item.kind === "vehicle" && item.vehiclePhotoId) {
          return vehiclePhotoUrls.get(item.vehiclePhotoId);
        }
        return item.fileUri;
      })
      .filter((url): url is string => Boolean(url));
  }, [reportPhotos, vehiclePhotoUrls]);

  const photoCount = allPhotoUrls.length;

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

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
            <View style={styles.carouselSection}>
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

          {reportOptions.include_technical_data && vehicle && (
            <VehicleTechnicalDataSummary vehicle={vehicle} />
          )}

          <View style={styles.section}>
            <ReportOptionsCard>
              <ReportSummaryOptionRow
                label={t("publicReport.optionServiceHistory")}
                status={reportSummaryStatus(
                  reportOptions.include_service_history,
                  serviceEntriesCount > 0,
                )}
                count={
                  reportOptions.include_service_history &&
                  serviceEntriesCount > 0
                    ? serviceEntriesCount
                    : undefined
                }
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionNotes", { vehicleTitle })}
                status={reportSummaryStatus(
                  reportOptions.include_notes,
                  hasNotes,
                )}
                isLast
              />
            </ReportOptionsCard>

            <ReportSummaryOptionGroup
              title={t("publicReport.formalitiesGroup")}
            >
              <ReportSummaryOptionRow
                label={t("publicReport.optionInsurance")}
                status={reportSummaryStatus(
                  reportOptions.include_insurance,
                  hasInsurance,
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionInspection")}
                status={reportSummaryStatus(
                  reportOptions.include_inspection,
                  hasInspection,
                )}
                isLast
              />
            </ReportSummaryOptionGroup>

            <ReportSummaryOptionGroup title={t("publicReport.wheelsGroup")}>
              <ReportSummaryOptionRow
                label={t("publicReport.optionTires")}
                status={reportSummaryStatus(
                  reportOptions.include_tires,
                  tiresCount > 0,
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionWheels")}
                status={reportSummaryStatus(
                  reportOptions.include_wheels,
                  wheelsCount > 0,
                )}
                isLast
              />
            </ReportSummaryOptionGroup>

            <ReportSummaryOptionGroup
              title={t("publicReport.exploitationStatsGroup")}
            >
              <ReportSummaryOptionRow
                label={t("publicReport.optionServiceStats")}
                status={reportSummaryStatus(
                  reportOptions.include_service_stats,
                  hasEnoughStatsEntries(serviceEntriesCount),
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionFuelingStats")}
                status={reportSummaryStatus(
                  reportOptions.include_fueling_stats,
                  hasEnoughStatsEntries(fuelingEntriesCount),
                )}
                isLast
              />
            </ReportSummaryOptionGroup>

            <ReportSummaryOptionGroup title={t("publicReport.chartsGroup")}>
              <ReportSummaryOptionRow
                label={t("publicReport.optionMileageOverTimeChart")}
                status={reportSummaryStatus(
                  reportOptions.include_mileage_over_time_chart,
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionExpensesOverTimeChart")}
                status={reportSummaryStatus(
                  reportOptions.include_expenses_over_time_chart,
                  hasEnoughStatsEntries(serviceEntriesCount),
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionExpensesByCategoryChart")}
                status={reportSummaryStatus(
                  reportOptions.include_expenses_by_category_chart,
                  hasEnoughStatsEntries(serviceEntriesCount),
                )}
                isLast
              />
            </ReportSummaryOptionGroup>

            <ReportOptionsCard>
              <ReportSummaryOptionRow
                label={t("publicReport.optionPhotos")}
                status={reportSummaryStatus(
                  reportOptions.include_photos,
                  photoCount > 0,
                )}
                count={
                  reportOptions.include_photos && photoCount > 0
                    ? photoCount
                    : undefined
                }
                isLast
              />
            </ReportOptionsCard>
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
            <Ionicons name="close" size={28} color="#FFFFFF" />
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
    carouselSection: {
      marginBottom: theme.spacing.sm,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.xl,
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
      borderRadius: theme.radius.xl,
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
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.card,
    },
    limitText: {
      fontSize: theme.typography.small,
      flex: 1,
    },
  });
