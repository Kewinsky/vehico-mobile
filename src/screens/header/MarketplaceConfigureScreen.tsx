import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { formatDateDisplay } from "../../utils/dateFormatting";
import {
  canProceedMarketplaceConfigure,
  marketplaceConfigureFieldErrors,
  marketplacePriceForNavigation,
  type MarketplaceConfigureFormState,
} from "../../forms/marketplaceConfigureForm";
import { useFormFieldErrors } from "../../core/hooks/useFormFieldErrors";

import { routes } from "../../core/navigation/routes";
import {
  hasEnoughStatsEntries,
  MIN_STATS_ENTRIES,
} from "../../types/reportOptions";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import { listPublicPages } from "../../services/publicPages/publicPagesRepo";
import type { Vehicle, PublicReportSnapshot } from "../../types/domain";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { ReportOptionGroup } from "../../ui/components/common/ReportOptionGroup";
import {
  getReportGroupMasterState,
  hasAnyEnabledReportOption,
  hasAnyCheckedReportOption,
  resetAllReportOptions,
  selectAllReportOptions,
  toggleReportGroupMaster,
  type ReportGroupItem,
} from "../../ui/components/common/reportOptionGroupUtils";
import { ReportOptionRow } from "../../ui/components/common/ReportOptionRow";
import { ReportOptionsCard } from "../../ui/components/common/ReportOptionsCard";
import { ReportOptionsActionsBar } from "../../ui/components/common/ReportOptionsActionsBar";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../core/providers/UserSettingsProvider";
import { toastError } from "../../ui/toast/toast";
import { openAlertPicker } from "../../ui/components/common/openAlertPicker";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";

export function MarketplaceConfigureScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuelingCount, setFuelingCount] = useState(0);
  const [serviceEntriesCount, setServiceEntriesCount] = useState(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [publicReports, setPublicReports] = useState<PublicReportSnapshot[]>(
    [],
  );

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;
  const hasWheels = wheelsCount > 0;
  const hasTires = tiresCount > 0;
  const hasServiceHistory = serviceEntriesCount > 0;
  const hasServiceStats = hasEnoughStatsEntries(serviceEntriesCount);
  const hasFuelingStats = hasEnoughStatsEntries(fuelingCount);

  const [includeTechnicalData] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [includeInspection, setIncludeInspection] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeWheels, setIncludeWheels] = useState(false);
  const [includeTires, setIncludeTires] = useState(false);
  const [includeServiceHistory, setIncludeServiceHistory] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeFuelingStats, setIncludeFuelingStats] = useState(false);
  const [includePrice, setIncludePrice] = useState(false);
  const [price, setPrice] = useState("");
  const [includePublicReport, setIncludePublicReport] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const formValues = useMemo(
    (): MarketplaceConfigureFormState => ({
      includePrice,
      price,
    }),
    [includePrice, price],
  );

  const fieldErrors = useMemo(
    () => marketplaceConfigureFieldErrors(formValues),
    [formValues],
  );

  const canProceed = useMemo(
    () => canProceedMarketplaceConfigure(formValues),
    [formValues],
  );

  const { fieldError, validateBeforeSave } = useFormFieldErrors(canProceed);

  const load = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const [v, fuelings, serviceEntries, tires, wheels, reports] =
        await Promise.all([
          getVehicle(vehicleId),
          listFuelingEntries(vehicleId),
          listServiceEntries(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
          listPublicPages(vehicleId),
        ]);
      setVehicle(v);
      setFuelingCount(fuelings.length);
      setServiceEntriesCount(serviceEntries.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);
      setPublicReports(reports);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const minStatsUnavailableBody = (count: number) =>
    t("publicReport.optionMinEntriesAlert", {
      min: MIN_STATS_ENTRIES,
      current: count,
    });

  const formalitiesGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasInsurance,
          checked: includeInsurance,
          setChecked: setIncludeInsurance,
        },
        {
          enabled: hasInspection,
          checked: includeInspection,
          setChecked: setIncludeInspection,
        },
      ]),
    [hasInsurance, hasInspection, includeInsurance, includeInspection],
  );

  const wheelsGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasTires,
          checked: includeTires,
          setChecked: setIncludeTires,
        },
        {
          enabled: hasWheels,
          checked: includeWheels,
          setChecked: setIncludeWheels,
        },
      ]),
    [hasTires, hasWheels, includeTires, includeWheels],
  );

  const exploitationGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasServiceStats,
          checked: includeServiceStats,
          setChecked: setIncludeServiceStats,
        },
        {
          enabled: hasFuelingStats,
          checked: includeFuelingStats,
          setChecked: setIncludeFuelingStats,
        },
      ]),
    [
      hasServiceStats,
      hasFuelingStats,
      includeServiceStats,
      includeFuelingStats,
    ],
  );

  const allReportOptions = useMemo((): ReportGroupItem[] => {
    return [
      {
        enabled: hasServiceHistory,
        checked: includeServiceHistory,
        setChecked: setIncludeServiceHistory,
      },
      {
        enabled: hasNotes,
        checked: includeNotes,
        setChecked: setIncludeNotes,
      },
      {
        enabled: hasInsurance,
        checked: includeInsurance,
        setChecked: setIncludeInsurance,
      },
      {
        enabled: hasInspection,
        checked: includeInspection,
        setChecked: setIncludeInspection,
      },
      {
        enabled: hasTires,
        checked: includeTires,
        setChecked: setIncludeTires,
      },
      {
        enabled: hasWheels,
        checked: includeWheels,
        setChecked: setIncludeWheels,
      },
      {
        enabled: hasServiceStats,
        checked: includeServiceStats,
        setChecked: setIncludeServiceStats,
      },
      {
        enabled: hasFuelingStats,
        checked: includeFuelingStats,
        setChecked: setIncludeFuelingStats,
      },
      {
        enabled: true,
        checked: includePrice,
        setChecked: setIncludePrice,
      },
      {
        enabled: publicReports.length > 0,
        checked: includePublicReport,
        setChecked: setIncludePublicReport,
      },
    ];
  }, [
    hasServiceHistory,
    hasNotes,
    hasInsurance,
    hasInspection,
    hasTires,
    hasWheels,
    hasServiceStats,
    hasFuelingStats,
    includeServiceHistory,
    includeNotes,
    includeInsurance,
    includeInspection,
    includeTires,
    includeWheels,
    includeServiceStats,
    includeFuelingStats,
    includePrice,
    publicReports.length,
    includePublicReport,
  ]);

  const canSelectAll = hasAnyEnabledReportOption(allReportOptions);
  const canReset =
    hasAnyCheckedReportOption(allReportOptions) || price.trim() !== "";

  function handleSelectAll() {
    selectAllReportOptions(allReportOptions);
  }

  function handleReset() {
    resetAllReportOptions(allReportOptions);
    setPrice("");
  }

  const getReportLabel = useCallback(
    (reportId: string) => {
      const report = publicReports.find((item) => item.id === reportId);
      if (!report) return reportId;
      const date = formatDateDisplay(report.created_at, i18n.language);
      return report.title || `${t("marketplace.report")} - ${date}`;
    },
    [publicReports, i18n.language, t],
  );

  const openReportPicker = useCallback(() => {
    openAlertPicker({
      cancelLabel: t("common.cancel"),
      choices: publicReports.map((report) => ({
        label: getReportLabel(report.id),
        onPress: () => setSelectedReportId(report.id),
      })),
    });
  }, [publicReports, getReportLabel, t]);

  const reportButtonLabel = useMemo(() => {
    if (!selectedReportId) return t("marketplace.selectReport");
    return getReportLabel(selectedReportId);
  }, [selectedReportId, getReportLabel, t]);

  function handleNext() {
    if (!vehicleId) return;
    if (!validateBeforeSave()) {
      if (includePrice) {
        toastError(
          price.trim() === ""
            ? t("marketplace.priceRequired")
            : t("marketplace.invalidPrice"),
        );
      }
      return;
    }

    const reportOptions = {
      include_technical_data: includeTechnicalData,
      include_insurance: includeInsurance,
      include_inspection: includeInspection,
      include_notes: includeNotes,
      include_wheels: includeWheels,
      include_tires: includeTires,
      include_service_history: includeServiceHistory,
      include_service_stats: includeServiceStats,
      include_fueling_stats: includeFuelingStats,
    };
    router.push(
      routes.marketplaceSummary(vehicleId, {
        reportOptions: JSON.stringify(reportOptions),
        includePrice,
        price: marketplacePriceForNavigation(formValues),
        currency: settings?.currency ?? "PLN",
        includePublicReport,
        selectedReportId: includePublicReport ? selectedReportId : undefined,
      }),
    );
  }

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => router.back()}
      showProfileAvatar
      footer={
        <Button onPress={handleNext}>{t("marketplace.nextButton")}</Button>
      }
    >
      <NativeHeaderScrollView keyboardDismissMode="on-drag">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <ContentHeader title={t("marketplace.configureTitle")} />
            <View>
              <ReportOptionsActionsBar
                onSelectAll={handleSelectAll}
                onReset={handleReset}
                selectAllDisabled={!canSelectAll}
                resetDisabled={!canReset}
              />
              <ReportOptionsCard>
                <ReportOptionRow
                  label={t("publicReport.optionServiceHistory")}
                  checked={includeServiceHistory}
                  onPress={() =>
                    setIncludeServiceHistory(!includeServiceHistory)
                  }
                  disabled={!hasServiceHistory}
                  unavailableTitle={t("publicReport.optionServiceHistory")}
                  unavailableBody={t(
                    "publicReport.optionServiceHistoryUnavailable",
                  )}
                />
                <ReportOptionRow
                  label={t("publicReport.optionNotes", { vehicleTitle })}
                  checked={includeNotes}
                  onPress={() => setIncludeNotes(!includeNotes)}
                  disabled={!hasNotes}
                  unavailableTitle={t("publicReport.optionNotes", {
                    vehicleTitle,
                  })}
                  unavailableBody={t("publicReport.unavailableNoData")}
                  isLast
                />
              </ReportOptionsCard>

              <ReportOptionGroup
                title={t("publicReport.formalitiesGroup")}
                masterChecked={formalitiesGroupState.masterChecked}
                masterDisabled={formalitiesGroupState.masterDisabled}
                onMasterToggle={() =>
                  toggleReportGroupMaster([
                    {
                      enabled: hasInsurance,
                      checked: includeInsurance,
                      setChecked: setIncludeInsurance,
                    },
                    {
                      enabled: hasInspection,
                      checked: includeInspection,
                      setChecked: setIncludeInspection,
                    },
                  ])
                }
              >
                <ReportOptionRow
                  label={t("publicReport.optionInsurance")}
                  checked={includeInsurance}
                  onPress={() => setIncludeInsurance(!includeInsurance)}
                  disabled={!hasInsurance}
                  unavailableTitle={t("publicReport.optionInsurance")}
                  unavailableBody={t("publicReport.unavailableNoData")}
                />
                <ReportOptionRow
                  label={t("publicReport.optionInspection")}
                  checked={includeInspection}
                  onPress={() => setIncludeInspection(!includeInspection)}
                  disabled={!hasInspection}
                  unavailableTitle={t("publicReport.optionInspection")}
                  unavailableBody={t("publicReport.unavailableNoData")}
                  isLast
                />
              </ReportOptionGroup>

              <ReportOptionGroup
                title={t("publicReport.wheelsGroup")}
                masterChecked={wheelsGroupState.masterChecked}
                masterDisabled={wheelsGroupState.masterDisabled}
                onMasterToggle={() =>
                  toggleReportGroupMaster([
                    {
                      enabled: hasTires,
                      checked: includeTires,
                      setChecked: setIncludeTires,
                    },
                    {
                      enabled: hasWheels,
                      checked: includeWheels,
                      setChecked: setIncludeWheels,
                    },
                  ])
                }
              >
                <ReportOptionRow
                  label={t("publicReport.optionTires")}
                  checked={includeTires}
                  onPress={() => setIncludeTires(!includeTires)}
                  disabled={!hasTires}
                  unavailableTitle={t("publicReport.optionTires")}
                  unavailableBody={t("publicReport.unavailableNoData")}
                />
                <ReportOptionRow
                  label={t("publicReport.optionWheels")}
                  checked={includeWheels}
                  onPress={() => setIncludeWheels(!includeWheels)}
                  disabled={!hasWheels}
                  unavailableTitle={t("publicReport.optionWheels")}
                  unavailableBody={t("publicReport.unavailableNoData")}
                  isLast
                />
              </ReportOptionGroup>

              <ReportOptionGroup
                title={t("publicReport.exploitationStatsGroup")}
                masterChecked={exploitationGroupState.masterChecked}
                masterDisabled={exploitationGroupState.masterDisabled}
                onMasterToggle={() =>
                  toggleReportGroupMaster([
                    {
                      enabled: hasServiceStats,
                      checked: includeServiceStats,
                      setChecked: setIncludeServiceStats,
                    },
                    {
                      enabled: hasFuelingStats,
                      checked: includeFuelingStats,
                      setChecked: setIncludeFuelingStats,
                    },
                  ])
                }
              >
                <ReportOptionRow
                  label={t("publicReport.optionServiceStats")}
                  checked={includeServiceStats}
                  onPress={() => setIncludeServiceStats(!includeServiceStats)}
                  disabled={!hasServiceStats}
                  unavailableTitle={t("publicReport.optionServiceStats")}
                  unavailableBody={minStatsUnavailableBody(serviceEntriesCount)}
                  infoTitle={t("publicReport.optionInfo.serviceStatsTitle")}
                  infoBody={t("publicReport.optionInfo.serviceStatsBody")}
                />
                <ReportOptionRow
                  label={t("publicReport.optionFuelingStats")}
                  checked={includeFuelingStats}
                  onPress={() => setIncludeFuelingStats(!includeFuelingStats)}
                  disabled={!hasFuelingStats}
                  unavailableTitle={t("publicReport.optionFuelingStats")}
                  unavailableBody={minStatsUnavailableBody(fuelingCount)}
                  infoTitle={t("publicReport.optionInfo.fuelingStatsTitle")}
                  infoBody={t("publicReport.optionInfo.fuelingStatsBody")}
                  isLast
                />
              </ReportOptionGroup>

              <ReportOptionsCard>
                <ReportOptionRow
                  label={t("marketplace.optionPrice")}
                  checked={includePrice}
                  onPress={() => setIncludePrice(!includePrice)}
                />
                {includePrice && (
                  <View
                    style={[
                      styles.priceRow,
                      {
                        backgroundColor: fieldError(fieldErrors.price)
                          ? hexToRgba(theme.colors.danger, 0.15)
                          : theme.colors.bg,
                      },
                    ]}
                  >
                    <View style={styles.priceRowLeft}>
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={theme.colors.accent}
                      />
                      <Text
                        style={[
                          styles.priceLabel,
                          { color: theme.colors.muted },
                        ]}
                        numberOfLines={1}
                      >
                        {t("marketplace.optionPrice")}
                      </Text>
                    </View>
                    <TextInput
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="number-pad"
                      keyboardAppearance={mode === "dark" ? "dark" : "light"}
                      placeholder={t("marketplace.pricePlaceholder")}
                      placeholderTextColor={theme.colors.muted}
                      style={[styles.priceInput, { color: theme.colors.fg }]}
                    />
                  </View>
                )}
                <ReportOptionRow
                  label={t("marketplace.optionPublicReport")}
                  checked={includePublicReport}
                  onPress={() => setIncludePublicReport(!includePublicReport)}
                  disabled={publicReports.length === 0}
                  unavailableTitle={t("marketplace.optionPublicReport")}
                  unavailableBody={t("marketplace.noReports")}
                  isLast={!includePublicReport}
                />
                {includePublicReport && publicReports.length > 0 ? (
                  <Button
                    variant="outlined"
                    color={theme.colors.accent}
                    onPress={openReportPicker}
                    style={styles.selectReportButton}
                  >
                    {reportButtonLabel}
                  </Button>
                ) : null}
              </ReportOptionsCard>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </NativeHeaderScrollView>
    </HeaderLayout>
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
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.xl,
      marginBottom: theme.spacing.sm,
    },
    priceRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 0,
    },
    priceLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    priceInput: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
      textAlign: "right",
    },
    selectReportButton: {
      marginBottom: theme.spacing.sm,
    },
  });
