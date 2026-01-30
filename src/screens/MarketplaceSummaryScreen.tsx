import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle, PublicReportSnapshot } from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { getPublicPageUrl } from "../services/publicPages/publicPagesRepo";
import {
  generateMarketplacePost,
  saveMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import type { Language } from "../types/domain";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplaceSummary">;

export function MarketplaceSummaryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    vehicleId,
    language,
    price,
    currency,
    reportOptions,
    selectedReportId,
  } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceEntriesCount, setServiceEntriesCount] = useState<number>(0);
  const [fuelingEntriesCount, setFuelingEntriesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [publicReports, setPublicReports] = useState<PublicReportSnapshot[]>(
    [],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, serviceEntries, fuelingEntries] = await Promise.all([
        getVehicle(vehicleId),
        listServiceEntries(vehicleId),
        listFuelingEntries(vehicleId),
      ]);
      setVehicle(v);
      setServiceEntriesCount(serviceEntries.length);
      setFuelingEntriesCount(fuelingEntries.length);
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

    try {
      setGenerating(true);

      // Get public report URL if selected
      let publicReportUrl: string | null = null;
      if (selectedReportId) {
        const { listPublicPages } =
          await import("../services/publicPages/publicPagesRepo");
        const reports = await listPublicPages(vehicleId);
        const selectedReport = reports.find((r) => r.id === selectedReportId);
        if (selectedReport) {
          publicReportUrl = await getPublicPageUrl(selectedReport.public_id);
        }
      }

      // Generate post
      const content = await generateMarketplacePost({
        vehicleId,
        language,
        price,
        currency,
        includeServiceEntries: reportOptions.include_service_entries,
        includeFuelingStats: reportOptions.include_fueling_stats,
        includeServiceStats: reportOptions.include_service_stats,
        includeNotes: reportOptions.include_notes,
        includeWheelsTires: reportOptions.include_wheels_tires ?? false,
        publicReportUrl,
      });

      // Save post automatically
      await saveMarketplacePost({
        vehicleId,
        language,
        price,
        content,
      });

      toastSuccess(t("marketplace.postGenerated"));

      navigation.reset({
        index: 1,
        routes: [
          {
            name: "Marketplace",
            params: { vehicleId },
          },
          {
            name: "MarketplacePostOptions",
            params: {
              content,
              vehicleTitle: vehicle ? `${vehicle.make} ${vehicle.model}` : "",
              vehicleId,
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
          <Text style={styles.h1}>{t("marketplace.summaryTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("marketplace.summarySubtitle")}
          </Text>
        </View>

        {/* Vehicle Info */}
        {vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("marketplace.vehicleInfo")}
            </Text>
            <View style={styles.infoCard}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t("vehicleForm.type")}</Text>
                <Text style={styles.dataValue}>
                  {vehicle.type === "car"
                    ? t("vehicleForm.car")
                    : t("vehicleForm.motorcycle")}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.makeLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.make}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.modelLabel")}
                </Text>
                <Text style={styles.dataValue}>{vehicle.model}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("vehicleForm.yearLabel")}
                </Text>
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
              {vehicle.insurance_valid_until != null && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>
                    {t("dashboard.stats.insuranceValidUntil")}
                  </Text>
                  <Text style={styles.dataValue}>
                    {vehicle.insurance_valid_until}
                  </Text>
                </View>
              )}
              {vehicle.inspection_valid_until != null && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>
                    {t("dashboard.stats.inspectionValidUntil")}
                  </Text>
                  <Text style={styles.dataValue}>
                    {vehicle.inspection_valid_until}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {reportOptions.include_notes && vehicle?.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("marketplace.notes")}</Text>
            <Text style={styles.notesText}>{vehicle.notes}</Text>
          </View>
        )}

        {/* Language and Price */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("marketplace.basicInfo")}</Text>
          <View style={styles.infoCard}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>
                {t("marketplace.languageLabel")}
              </Text>
              <Text style={styles.dataValue}>
                {language === "pl"
                  ? t("marketplace.languagePl")
                  : t("marketplace.languageEn")}
              </Text>
            </View>
            {price !== null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("marketplace.priceLabel")}
                </Text>
                <Text style={styles.dataValue}>
                  {price.toLocaleString()} {currency}
                </Text>
              </View>
            )}
            {selectedReportId && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>
                  {t("marketplace.publicReport")}
                </Text>
                <Text style={styles.dataValue}>
                  {t("marketplace.included")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Service Entries */}
        {reportOptions.include_service_entries && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("marketplace.serviceEntries")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("marketplace.serviceEntries"),
                    t("marketplace.dataUsedForPost"),
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

        {/* Fueling Stats */}
        {reportOptions.include_fueling_stats && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("marketplace.fuelingStats")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("marketplace.fuelingStats"),
                    t("marketplace.dataUsedForPost"),
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
            <Text style={styles.countValue}>
              {fuelingEntriesCount} {t("marketplace.entries")}
            </Text>
          </View>
        )}

        {/* Service Stats */}
        {reportOptions.include_service_stats && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("marketplace.serviceStats")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("marketplace.serviceStats"),
                    t("marketplace.dataUsedForPost"),
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

        {/* Wheels and tires */}
        {reportOptions.include_wheels_tires && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>
                {t("marketplace.wheelsAndTires")}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    t("marketplace.wheelsAndTires"),
                    t("marketplace.dataUsedForPost"),
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
            <Text style={styles.countValue}>{t("marketplace.included")}</Text>
          </View>
        )}

        {/* Confirmation Checkbox */}
        <View style={styles.section}>
          <Pressable
            style={styles.confirmationRow}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View
              style={[
                styles.confirmationCheckbox,
                confirmed && styles.confirmationCheckboxChecked,
              ]}
            >
              {confirmed && (
                <Ionicons name="checkmark" size={16} color="#000000" />
              )}
            </View>
            <Text style={styles.confirmationText}>
              {t("marketplace.confirmationCheckbox")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={handleGeneratePost}
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
                {t("marketplace.generating")}
              </Text>
            </View>
          ) : (
            t("marketplace.generatePostButton")
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
    infoCard: {
      backgroundColor: "transparent",
      padding: 0,
      gap: 0,
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
      fontSize: theme.typography.small,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    countValue: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.accent,
    },
    notesText: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.fg,
    },
    confirmationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    confirmationCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    confirmationCheckboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    confirmationText: {
      flex: 1,
      fontSize: theme.typography.small,
      color: theme.colors.fg,
      lineHeight: theme.typography.body + 4,
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
  });
