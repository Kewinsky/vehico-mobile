import {
  StyleSheet,
  Text,
  View,
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
import { hasEnoughStatsEntries } from "../../types/reportOptions";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import { listVehicleEquipment } from "../../services/equipment/vehicleEquipmentRepo";
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
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastCaughtError, toastError, toastSuccess } from "../../ui/toast/toast";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { groupThousands } from "../../utils/numberFormatting";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { ReportOptionsCard } from "../../ui/components/common/ReportOptionsCard";
import { ReportSummaryOptionGroup } from "../../ui/components/common/ReportSummaryOptionGroup";
import { ReportSummaryOptionRow } from "../../ui/components/common/ReportSummaryOptionRow";
import { reportSummaryStatus } from "../../ui/components/common/reportSummaryUtils";
import { VehicleTechnicalDataSummary } from "../../ui/components/common/VehicleTechnicalDataSummary";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplaceSummary">;

export function MarketplaceSummaryScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
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

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries, tires, wheels, equipment] =
        await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
          listVehicleEquipment(vehicleId),
        ]);
      setVehicle(v);
      setServiceEntriesCount(serviceEntries.length);
      setFuelingEntriesCount(fuelingEntries.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);
      setEquipmentCount(equipment.length);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
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
    if (
      includePrice &&
      (price == null || !Number.isFinite(price) || price <= 0)
    ) {
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
      toastCaughtError(e, t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasAc = (vehicle?.ac_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
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
                label={t("publicReport.optionInsuranceOc")}
                status={reportSummaryStatus(
                  reportOptions.include_insurance,
                  hasInsurance,
                )}
              />
              <ReportSummaryOptionRow
                label={t("publicReport.optionInsuranceAc")}
                status={reportSummaryStatus(
                  reportOptions.include_ac,
                  hasAc,
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

            <ReportOptionsCard>
              <ReportSummaryOptionRow
                label={t("publicReport.optionEquipment")}
                status={reportSummaryStatus(
                  reportOptions.include_equipment,
                  equipmentCount > 0,
                )}
                count={
                  reportOptions.include_equipment && equipmentCount > 0
                    ? equipmentCount
                    : undefined
                }
                isLast
              />
            </ReportOptionsCard>

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

            <ReportOptionsCard>
              <ReportSummaryOptionRow
                label={t("marketplace.optionPrice")}
                status={reportSummaryStatus(includePrice)}
                value={
                  includePrice && price != null && price > 0
                    ? `${groupThousands(price, 0, i18n.language)} ${currency}`
                    : undefined
                }
              />
              <ReportSummaryOptionRow
                label={t("marketplace.optionPublicReport")}
                status={reportSummaryStatus(
                  includePublicReport,
                  !!selectedReportId,
                )}
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
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
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
