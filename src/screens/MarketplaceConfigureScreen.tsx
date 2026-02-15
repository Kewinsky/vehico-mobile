import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { formatDateDisplay } from "../utils/dateFormatting";
import { i18n } from "../i18n/i18n";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listVehicleTires } from "../services/tires/tiresRepo";
import { listVehicleWheels } from "../services/wheels/wheelsRepo";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { listPublicPages } from "../services/publicPages/publicPagesRepo";
import type { Vehicle, PublicReportSnapshot } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { PickerField } from "../ui/components/PickerField";
import { TextField } from "../ui/components/TextField";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplaceConfigure">;

export function MarketplaceConfigureScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

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
  const [includePrice, setIncludePrice] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>(settings?.currency ?? "PLN");
  const [includePublicReport, setIncludePublicReport] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
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

  const unavailableOptions = useMemo(() => {
    const list: string[] = [];
    if (!hasInsurance) list.push(t("publicReport.optionInsurance"));
    if (!hasInspection) list.push(t("publicReport.optionInspection"));
    if (!hasNotes) list.push(t("publicReport.notes"));
    if (!hasWheels) list.push(t("publicReport.optionWheels"));
    if (!hasTires) list.push(t("publicReport.optionTires"));
    if (!hasServiceHistory) list.push(t("publicReport.optionServiceHistory"));
    if (!hasFuelingStats) list.push(t("publicReport.optionFuelingStats"));
    if (publicReports.length === 0)
      list.push(
        `${t("marketplace.optionPublicReport")} (${t("marketplace.noReports")})`,
      );
    return list;
  }, [
    hasInsurance,
    hasInspection,
    hasNotes,
    hasWheels,
    hasTires,
    hasServiceHistory,
    hasFuelingStats,
    publicReports.length,
    t,
  ]);

  function handleNext() {
    const priceNum = price.trim().length ? Number(price) : null;
    if (includePrice && price.trim().length && !Number.isFinite(priceNum)) {
      toastError(t("marketplace.invalidPrice"));
      return;
    }

    navigation.navigate("MarketplaceSummary", {
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
      },
      includePrice,
      price: priceNum,
      currency,
      includePublicReport,
      selectedReportId: includePublicReport ? selectedReportId : null,
    });
  }

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
      <View
        style={[
          styles.optionCheckbox,
          checked && styles.optionCheckboxChecked,
          disabled && styles.optionCheckboxDisabled,
        ]}
      >
        {checked && <Ionicons name="checkmark" size={16} color="#000000" />}
      </View>
    </Pressable>
  );

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
        <Button onPress={handleNext}>{t("marketplace.nextButton")}</Button>
      }
    >
      <ScreenLayout title={t("marketplace.configureTitle")} scrollable={true}>
        <View style={styles.scrollView}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <CheckboxRow
                  label={t("publicReport.optionTechnicalData")}
                  checked={includeTechnicalData}
                  onPress={() => {}}
                  disabled
                  suffix={t("publicReport.optionTechnicalDataAlways")}
                />
                <CheckboxRow
                  label={t("publicReport.optionInsurance")}
                  checked={includeInsurance}
                  onPress={() => setIncludeInsurance(!includeInsurance)}
                  disabled={!hasInsurance}
                  suffix={
                    !hasInsurance ? `(${t("publicReport.noData")})` : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionInspection")}
                  checked={includeInspection}
                  onPress={() => setIncludeInspection(!includeInspection)}
                  disabled={!hasInspection}
                  suffix={
                    !hasInspection ? `(${t("publicReport.noData")})` : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionNotes", {
                    vehicleTitle: vehicle
                      ? `${vehicle.make} ${vehicle.model}`
                      : "",
                  })}
                  checked={includeNotes}
                  onPress={() => setIncludeNotes(!includeNotes)}
                  disabled={!hasNotes}
                  suffix={
                    !hasNotes ? `(${t("publicReport.noData")})` : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionWheels")}
                  checked={includeWheels}
                  onPress={() => setIncludeWheels(!includeWheels)}
                  disabled={!hasWheels}
                  suffix={
                    !hasWheels ? `(${t("publicReport.noData")})` : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionTires")}
                  checked={includeTires}
                  onPress={() => setIncludeTires(!includeTires)}
                  disabled={!hasTires}
                  suffix={
                    !hasTires ? `(${t("publicReport.noData")})` : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionServiceHistory")}
                  checked={includeServiceHistory}
                  onPress={() =>
                    setIncludeServiceHistory(!includeServiceHistory)
                  }
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
                    !hasServiceStats
                      ? `(${t("publicReport.noData")})`
                      : undefined
                  }
                />
                <CheckboxRow
                  label={t("publicReport.optionFuelingStats")}
                  checked={includeFuelingStats}
                  onPress={() => setIncludeFuelingStats(!includeFuelingStats)}
                  disabled={!hasFuelingStats}
                  suffix={
                    !hasFuelingStats
                      ? `(${t("publicReport.noData")})`
                      : undefined
                  }
                />
                <CheckboxRow
                  label={t("marketplace.optionPrice")}
                  checked={includePrice}
                  onPress={() => setIncludePrice(!includePrice)}
                />
                {includePrice && (
                  <View style={styles.priceSection}>
                    <View style={styles.priceField}>
                      <TextField
                        noMarginTop
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                        placeholder={t("marketplace.pricePlaceholder")}
                      />
                    </View>
                    <View style={styles.currencyField}>
                      <PickerField
                        noMarginTop
                        label=""
                        value={currency}
                        options={["PLN", "EUR"] as const}
                        getLabel={(value) => value}
                        onChange={(value) => {
                          if (value) setCurrency(value);
                        }}
                      />
                    </View>
                  </View>
                )}
                <CheckboxRow
                  label={t("marketplace.optionPublicReport")}
                  checked={includePublicReport}
                  onPress={() => setIncludePublicReport(!includePublicReport)}
                  disabled={publicReports.length === 0}
                  suffix={
                    publicReports.length === 0
                      ? `(${t("marketplace.noReports")})`
                      : undefined
                  }
                />
                {includePublicReport && (
                  <View style={styles.section}>
                    {publicReports.length > 0 ? (
                      <PickerField
                        noMarginTop
                        label=""
                        value={selectedReportId as string | null}
                        options={
                          publicReports.map((r) => r.id) as readonly string[]
                        }
                        getLabel={(value) => {
                          const report = publicReports.find(
                            (r) => r.id === value,
                          );
                          if (!report) return t("marketplace.noReport");
                          const date = formatDateDisplay(
                            report.created_at,
                            i18n.language,
                          );
                          return (
                            report.title ||
                            `${t("marketplace.report")} - ${date}`
                          );
                        }}
                        onChange={(value) => setSelectedReportId(value)}
                        placeholder={t("marketplace.noReport")}
                      />
                    ) : (
                      <Text style={styles.noReportsText}>
                        {t("marketplace.noReports")}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {unavailableOptions.length > 0 && (
                <View style={[styles.section, styles.hintSection]}>
                  <Text style={styles.hintText}>
                    {t("publicReport.unavailableOptionsHint", {
                      list: unavailableOptions.join(", "),
                    })}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    header: { gap: theme.spacing.xs / 2, marginBottom: theme.spacing.md },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    },
    section: { marginBottom: theme.spacing.lg },
    hintSection: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      fontWeight: "700",
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    priceSection: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    priceField: { flex: 3 },
    currencyField: { flex: 1 },
    noReportsText: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    checkboxRowDisabled: { opacity: 0.7 },
    optionCheckbox: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.xs,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionCheckboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    optionCheckboxDisabled: { opacity: 0.6 },
    optionLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
  });
