import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { listVehicleTires } from "../services/tires/tiresRepo";
import { listVehicleWheels } from "../services/wheels/wheelsRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import {
  generatePublicPageWithOptions,
  getPublicPageUrl,
  updatePublicReportTempPhotos,
} from "../services/publicPages/publicPagesRepo";
import { uploadReportPhotos } from "../services/publicPages/uploadReportPhoto";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportSummary">;

function InfoCard({
  title,
  status,
  count,
  theme,
  styles,
}: {
  title: string;
  status: "included" | "notIncluded" | "noData";
  count?: number;
  theme: any;
  styles: any;
}) {
  const { t } = useTranslation();
  const value =
    status === "included"
      ? count != null
        ? t("publicReport.includedWithCount", { count })
        : t("publicReport.included")
      : status === "noData"
        ? t("publicReport.noData")
        : t("publicReport.notIncluded");
  const valueColor =
    status === "included" ? theme.colors.accent : theme.colors.muted;

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      <Text style={[styles.infoCardValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function PublicReportSummaryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, reportOptions, selectedVehiclePhotoIds, tempPhotos } =
    route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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
    selectedVehiclePhotoIds.forEach((id) => {
      const url = vehiclePhotoUrls.get(id);
      if (url) urls.push(url);
    });
    tempPhotos.forEach((photo) => urls.push(photo.fileUri));
    return urls;
  }, [selectedVehiclePhotoIds, vehiclePhotoUrls, tempPhotos]);

  const photoCount = allPhotoUrls.length;

  if (loading) {
    return (
      <Screen
        padding={false}
        header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
      >
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
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
              <Text style={{ color: "#000000", fontWeight: "700" }}>
                {t("publicReport.generating")}
              </Text>
            </View>
          ) : (
            t("publicReport.generateReportButton")
          )}
        </Button>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>{t("publicReport.summaryTitle")}</Text>
        </View>

        {/* Summary of technical data */}
        {reportOptions.include_technical_data && vehicle && (
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
            {vehicle.mileage != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.mileageLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {vehicle.mileage.toLocaleString()} {distanceUnit}
                </Text>
              </View>
            )}
            {vehicle.engine_capacity != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.engineCapacityLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {vehicle.engine_capacity} cm³
                </Text>
              </View>
            )}
            {vehicle.power_hp != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.powerHpLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.power_hp} HP</Text>
              </View>
            )}
            {vehicle.transmission != null && (
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
            {vehicle.drive_type != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.driveTypeLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.drive_type}</Text>
              </View>
            )}
            {vehicle.fuel_type != null && (
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
          </View>
        )}

        {/* InfoCards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("publicReport.includedData")}
          </Text>
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
              reportOptions.include_service_history && serviceEntriesCount > 0
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
          />
        </View>

        {/* Entitlements info */}
        {!isPremium && (
          <View style={styles.section}>
            <View
              style={[
                styles.limitInfo,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
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
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl * 2,
    },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.spacing.md,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
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
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.fg,
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
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
    dataValue: {
      fontSize: theme.typography.body,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    infoCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoCardTitle: {
      fontSize: theme.typography.body,
      color: theme.colors.fg,
      flex: 1,
    },
    infoCardValue: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: theme.spacing.lg,
      height: theme.spacing.lg,
      borderRadius: theme.radius.xs,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.xs,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
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
      borderWidth: 1,
    },
    limitText: {
      fontSize: theme.typography.small,
      flex: 1,
    },
  });
