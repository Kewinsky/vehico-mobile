import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle, PublicReportSnapshot } from "../types/domain";
import {
  listPublicPages,
  getPublicPageUrl,
} from "../services/publicPages/publicPagesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { PickerField } from "../ui/components/PickerField";
import { TextField } from "../ui/components/TextField";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import type { Language } from "../types/domain";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplaceConfigure">;

export function MarketplaceConfigureScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  // Language and price
  const [language, setLanguage] = useState<Language>(
    (i18n.language as Language) || (settings?.language as Language) || "pl",
  );
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>(settings?.currency ?? "PLN");

  // Report options: service entries (always on), fueling stats, service stats, notes
  const [includeServiceEntries] = useState(true); // Always true, mandatory
  const [includeFuelingStats, setIncludeFuelingStats] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeWheelsTires, setIncludeWheelsTires] = useState(false);

  // Public report selection
  const [publicReports, setPublicReports] = useState<PublicReportSnapshot[]>(
    [],
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v] = await Promise.all([getVehicle(vehicleId)]);
      setVehicle(v);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  const loadPublicReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const reports = await listPublicPages(vehicleId);
      setPublicReports(reports);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoadingReports(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
    void loadPublicReports();
  }, [load, loadPublicReports]);

  function handleNext() {
    const priceNum = price.trim().length ? Number(price) : null;
    if (price.trim().length && !Number.isFinite(priceNum)) {
      toastError(t("marketplace.invalidPrice"));
      return;
    }

    // Prepare data for summary screen
    navigation.navigate("MarketplaceSummary", {
      vehicleId,
      language,
      price: priceNum,
      currency,
      reportOptions: {
        include_service_entries: includeServiceEntries,
        include_fueling_stats: includeFuelingStats,
        include_service_stats: includeServiceStats,
        include_notes: includeNotes,
        include_wheels_tires: includeWheelsTires,
      },
      selectedReportId,
    });
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>{t("marketplace.configureTitle")}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : (
          <>
            {/* Language and Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("marketplace.basicInfo")}
              </Text>
              <PickerField
                noMarginTop
                label={t("marketplace.languageLabel")}
                value={language}
                options={["en", "pl"] as const}
                getLabel={(value) =>
                  value === "en"
                    ? t("marketplace.languageEn")
                    : t("marketplace.languagePl")
                }
                onChange={(value) => {
                  if (value) setLanguage(value);
                }}
              />
              <TextField
                label={t("marketplace.priceLabel")}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder={t("marketplace.pricePlaceholder", { currency })}
              />
              <View style={{ height: theme.spacing.sm }} />
              <PickerField
                noMarginTop
                label={t("settings.currency")}
                value={currency}
                options={["PLN", "EUR"] as const}
                getLabel={(value) => value}
                onChange={(value) => {
                  if (value) setCurrency(value);
                }}
              />
            </View>

            {/* Report Options - checkboxes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("marketplace.vehicleInfo")}
              </Text>
              {/* Service entries - always checked */}
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
              {/* Fueling stats */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIncludeFuelingStats(!includeFuelingStats)}
              >
                <View
                  style={[
                    styles.optionCheckbox,
                    includeFuelingStats && styles.optionCheckboxChecked,
                  ]}
                >
                  {includeFuelingStats && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </View>
                <Text style={styles.optionLabel}>
                  {t("marketplace.fuelingStats")}
                </Text>
              </Pressable>
              {/* Service stats */}
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
              {/* Notes */}
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
              {/* Wheels and tires */}
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

            {/* Public Report Selection */}
            {loadingReports ? (
              <View style={styles.loadingContainer}>
                <LoadingIndicator />
              </View>
            ) : publicReports.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("marketplace.publicReport")}
                </Text>
                <PickerField
                  noMarginTop
                  label={t("marketplace.selectReport")}
                  value={selectedReportId as string | null}
                  options={publicReports.map((r) => r.id) as readonly string[]}
                  getLabel={(value) => {
                    const report = publicReports.find((r) => r.id === value);
                    if (!report) return t("marketplace.noReport");
                    const date = new Date(
                      report.created_at,
                    ).toLocaleDateString();
                    return (
                      report.title || `${t("marketplace.report")} - ${date}`
                    );
                  }}
                  onChange={(value) => {
                    setSelectedReportId(value);
                  }}
                  placeholder={t("marketplace.noReport")}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={handleNext}>{t("marketplace.nextButton")}</Button>
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
    loadingContainer: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
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
      fontSize: 15,
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
