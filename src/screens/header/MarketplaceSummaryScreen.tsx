import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../../types/domain";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import {
  getPublicPageUrl,
  listPublicPages,
} from "../../services/publicPages/publicPagesRepo";
import {
  generateMarketplacePost,
  saveMarketplacePost,
} from "../../services/marketplace/marketplaceRepo";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import {
  formatDateDisplay,
  formatShortDisplayDate,
} from "../../utils/dateFormatting";
import { groupThousands } from "../../utils/numberFormatting";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplaceSummary">;

function InfoCard({
  title,
  status,
  count,
  value: customValue,
  isLast = false,
  theme,
  styles,
}: {
  title: string;
  status: "included" | "notIncluded" | "noData";
  count?: number;
  value?: string;
  isLast?: boolean;
  theme: any;
  styles: any;
}) {
  const { t } = useTranslation();
  const value =
    status === "included"
      ? customValue != null
        ? customValue
        : count != null
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

export function MarketplaceSummaryScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    vehicleId,
    reportOptions,
    includePrice,
    price,
    currency,
    includePublicReport,
    selectedReportId,
  } = route.params;
  const { distanceUnitLabel } = useUnitDisplay();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries, tires, wheels] =
        await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
        ]);
      setVehicle(v);
      setServiceEntriesCount(serviceEntries.length);
      setFuelingEntriesCount(fuelingEntries.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGeneratePost() {
    if (!confirmed) {
      toastError(t("marketplace.confirmationRequired"));
      return;
    }
    if (includePrice && (price == null || !Number.isFinite(price) || price <= 0)) {
      toastError(t("marketplace.priceRequired"));
      return;
    }

    // Check entitlements
    if (!isPremium) {
      navigation.navigate("Shop");
      return;
    }

    try {
      setGenerating(true);

      let publicReportUrl: string | null = null;
      if (includePublicReport && selectedReportId) {
        const reports = await listPublicPages(vehicleId);
        const selectedReport = reports.find((r) => r.id === selectedReportId);
        if (selectedReport) {
          publicReportUrl = await getPublicPageUrl(selectedReport.public_id);
        }
      }

      const content = await generateMarketplacePost({
        vehicleId,
        reportOptions,
        includePrice,
        price,
        currency,
        includePublicReport,
        publicReportUrl,
      });

      await saveMarketplacePost({
        vehicleId,
        price: includePrice ? price : null,
        content,
      });

      toastSuccess(t("marketplace.postGenerated"));

      navigation.reset({
        index: 4,
        routes: [
          { name: "Vehicles" },
          { name: "VehicleDashboard", params: { vehicleId } },
          { name: "Share", params: { vehicleId } },
          { name: "Marketplace", params: { vehicleId } },
          {
            name: "MarketplacePostOptions",
            params: {
              content,
              vehicleTitle: vehicle ? `${vehicle.make} ${vehicle.model}` : "",
              vehicleId,
              generatedAt: `${t("marketplace.generatedOn")} ${formatShortDisplayDate(new Date().toISOString(), i18n.language)}`,
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
          onPress={handleGeneratePost}
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
                {t("marketplace.generating")}
              </Text>
            </View>
          ) : (
            t("marketplace.generatePostButton")
          )}
        </Button>
      }
      title={t("marketplace.summaryTitle")}
    >
      {!loading && (
        <>
          {/* Technical data */}
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
                    ? `${groupThousands(vehicle.mileage, 0, i18n.language)} ${distanceUnitLabel}`
                    : dash;
                const initialMileageVal =
                  vehicle.initial_mileage != null
                    ? `${groupThousands(vehicle.initial_mileage, 0, i18n.language)} ${distanceUnitLabel}`
                    : dash;
                const engineVal =
                  vehicle.engine_capacity != null
                    ? `${groupThousands(vehicle.engine_capacity, 0, i18n.language)} cm³`
                    : dash;
                const powerVal =
                  vehicle.power_hp != null
                    ? `${groupThousands(vehicle.power_hp, 0, i18n.language)} ${t("vehicleForm.powerOutputUnit")}`
                    : dash;
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
                        {t("vehicleForm.initialMileageLabel")}
                      </Text>
                      <Text
                        style={[
                          styles.dataValue,
                          { color: valueColor(initialMileageVal) },
                        ]}
                      >
                        {initialMileageVal}
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
              title={t("marketplace.optionPrice")}
              status={includePrice ? "included" : "notIncluded"}
              value={
                includePrice && price != null && price > 0
                  ? `${groupThousands(price, 0, i18n.language)} ${currency}`
                  : undefined
              }
              theme={theme}
              styles={styles}
            />
            <InfoCard
              title={t("marketplace.optionPublicReport")}
              status={
                includePublicReport
                  ? selectedReportId
                    ? "included"
                    : "noData"
                  : "notIncluded"
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
                  color={
                    confirmed ? theme.colors.accent : theme.colors.muted
                  }
                />
                <Text style={styles.checkboxLabel}>
                  {t("marketplace.confirmationCheckbox")}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
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
