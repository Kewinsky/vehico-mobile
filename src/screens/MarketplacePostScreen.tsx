import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { formatDateDisplay } from "../utils/dateFormatting";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { PublicReportSnapshot } from "../types/domain";
import {
  generateMarketplacePost,
  resolveMarketplacePostContent,
  saveMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import {
  listPublicPages,
  getPublicPageUrl,
} from "../services/publicPages/publicPagesRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { ChoiceChip } from "../ui/components/ChoiceChip";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplacePost">;

export function MarketplacePostScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>(settings?.currency ?? "PLN");
  const [content, setContent] = useState<{ pl: string; en: string } | "">("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl",
  );
  const displayContent = useMemo(() => {
    if (typeof content === "string") {
      return resolveMarketplacePostContent(content, displayLang);
    }
    return content ? (content[displayLang] ?? "") : "";
  }, [content, displayLang]);

  function handleContentChange(newText: string) {
    if (typeof content === "object" && content != null) {
      setContent({ ...content, [displayLang]: newText });
    } else {
      setContent({ pl: newText, en: newText });
    }
  }

  // Report options - same structure as Configure
  const [includeServiceHistory, setIncludeServiceHistory] = useState(true);
  const [includeFuelingStats, setIncludeFuelingStats] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeWheelsTires, setIncludeWheelsTires] = useState(false);
  const includeInsurance = true;
  const includeInspection = true;
  const [includePublicReport, setIncludePublicReport] = useState(false);

  // Public report selection
  const [publicReports, setPublicReports] = useState<PublicReportSnapshot[]>(
    [],
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

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
    void loadPublicReports();
  }, [loadPublicReports]);

  async function handleGenerate() {
    try {
      setGenerating(true);
      const priceNum = price.trim().length ? Number(price) : null;
      if (price.trim().length && !Number.isFinite(priceNum)) {
        throw new Error(t("marketplace.invalidPrice"));
      }

      // Get public report URL if selected
      let publicReportUrl: string | null = null;
      if (selectedReportId) {
        const selectedReport = publicReports.find(
          (r) => r.id === selectedReportId,
        );
        if (selectedReport) {
          publicReportUrl = await getPublicPageUrl(selectedReport.public_id);
        }
      }

      const generated = await generateMarketplacePost({
        vehicleId,
        reportOptions: {
          include_technical_data: true,
          include_insurance: includeInsurance,
          include_inspection: includeInspection,
          include_notes: includeNotes,
          include_wheels: includeWheelsTires,
          include_tires: includeWheelsTires,
          include_service_history: includeServiceHistory,
          include_service_stats: includeServiceStats,
          include_fueling_stats: includeFuelingStats,
        },
        includePrice: priceNum != null && priceNum > 0,
        price: priceNum,
        currency,
        includePublicReport: !!selectedReportId,
        publicReportUrl,
      });

      setContent(generated);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      if (!displayContent.trim()) {
        toastError(t("marketplace.noContentToCopy"));
        return;
      }
      await Clipboard.setStringAsync(displayContent);
      toastSuccess(t("marketplace.copiedToClipboard"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function handleSave() {
    try {
      const contentToSave =
        typeof content === "object" && content != null
          ? content
          : { pl: "", en: "" };
      if (!contentToSave.pl?.trim() && !contentToSave.en?.trim()) {
        toastError(t("marketplace.noContentToSave"));
        return;
      }

      setSaving(true);
      const priceNum = price.trim().length ? Number(price) : null;

      await saveMarketplacePost({
        vehicleId,
        price: priceNum,
        content: contentToSave,
      });
      toastSuccess(t("marketplace.saved"));
      setContent("");
      setPrice("");
      setCurrency(settings?.currency ?? "PLN");
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    Alert.alert(
      t("marketplace.regenerateTitle"),
      t("marketplace.regenerateBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("marketplace.regenerate"),
          style: "destructive",
          onPress: () => {
            setContent("" as "" | { pl: string; en: string });
            void handleGenerate();
          },
        },
      ],
    );
  }

  return (
    <FormScreen header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }>
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("marketplace.title")}</Text>

      <View style={{ height: theme.spacing.md }} />

      <TextField
        label={t("marketplace.priceLabel")}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder={t("marketplace.pricePlaceholder")}
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

      <View style={{ height: theme.spacing.md }} />

      {/* Report Options Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("marketplace.vehicleInfo")}</Text>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setIncludeServiceHistory(!includeServiceHistory)}
        >
          <View
            style={[
              styles.optionCheckbox,
              includeServiceHistory && styles.optionCheckboxChecked,
            ]}
          >
            {includeServiceHistory && (
              <Ionicons name="checkmark" size={16} color="#000000" />
            )}
          </View>
          <Text style={styles.optionLabel}>
            {t("marketplace.serviceEntries")}
          </Text>
        </Pressable>
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
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setIncludePublicReport(!includePublicReport)}
        >
          <View
            style={[
              styles.optionCheckbox,
              includePublicReport && styles.optionCheckboxChecked,
            ]}
          >
            {includePublicReport && (
              <Ionicons name="checkmark" size={16} color="#000000" />
            )}
          </View>
          <Text style={styles.optionLabel}>
            {t("marketplace.publicReport")}
          </Text>
        </Pressable>
      </View>

      {/* Public Report Selection */}
      {includePublicReport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("marketplace.publicReport")}
          </Text>
          {loadingReports ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
          ) : publicReports.length > 0 ? (
            <PickerField
              noMarginTop
              label=""
              value={selectedReportId as string | null}
              options={publicReports.map((r) => r.id) as readonly string[]}
              getLabel={(value) => {
                const report = publicReports.find((r) => r.id === value);
                if (!report) return t("marketplace.noReport");
                const date = formatDateDisplay(
                  report.created_at,
                  i18n.language,
                );
                return report.title || `${t("marketplace.report")} - ${date}`;
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

      <View style={{ height: theme.spacing.md }} />

      <Button onPress={handleGenerate} disabled={generating || saving}>
        {generating ? (
          <View style={styles.loadingRow}>
            <Text style={[styles.buttonText, { color: "#000000" }]}>
              {t("marketplace.generating")}
            </Text>
          </View>
        ) : (
          t("marketplace.generate")
        )}
      </Button>
      <View style={{ height: theme.spacing.xs }} />
      <Button
        onPress={() =>
          navigation.navigate("MarketplacePostHistory", {
            vehicleId,
          })
        }
        variant="ghost"
      >
        {t("marketplace.viewHistory")}
      </Button>

      {content && (typeof content !== "object" || content.pl || content.en) ? (
        <>
          <View style={{ height: theme.spacing.md }} />

          <Text style={styles.label}>{t("marketplace.contentLabel")}</Text>
          <View style={styles.langRow}>
            <View style={styles.langCol}>
              <ChoiceChip
                label={t("marketplace.languagePl")}
                selected={displayLang === "pl"}
                onPress={() => setDisplayLang("pl")}
              />
            </View>
            <View style={styles.langCol}>
              <ChoiceChip
                label={t("marketplace.languageEn")}
                selected={displayLang === "en"}
                onPress={() => setDisplayLang("en")}
              />
            </View>
          </View>
          <View style={{ height: theme.spacing.xs }} />

          <View
            style={[
              styles.textAreaContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <TextInput
              key={displayLang}
              style={[styles.textArea, { color: theme.colors.fg }]}
              value={displayContent}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
              placeholder={t("marketplace.contentPlaceholder")}
              placeholderTextColor={theme.colors.muted}
              keyboardAppearance={mode === "dark" ? "dark" : "light"}
            />
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button
                onPress={handleCopy}
                variant="ghost"
                disabled={generating || saving}
              >
                {t("marketplace.copyToClipboard")}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                onPress={() => {
                  if (!saving && !generating) {
                    void handleSave();
                  }
                }}
                disabled={generating || saving}
              >
                {saving ? (
                  <View style={styles.loadingRow}>
                    <Text
                      style={[
                        styles.buttonText,
                        { color: "#000000", marginLeft: theme.spacing.xs },
                      ]}
                    >
                      {t("marketplace.saving")}
                    </Text>
                  </View>
                ) : (
                  t("marketplace.savePost")
                )}
              </Button>
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <Button
            onPress={handleRegenerate}
            variant="ghost"
            disabled={generating || saving}
          >
            {t("marketplace.regenerate")}
          </Button>
        </>
      ) : null}

      <View style={{ height: theme.spacing.md }} />
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    langRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    langCol: {
      flex: 1,
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
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
    optionCheckboxDisabled: {
      opacity: 0.8,
    },
    optionLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
    textAreaContainer: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      minHeight: 300,
      padding: theme.spacing.sm,
    },
    textArea: {
      flex: 1,
      fontSize: theme.typography.body,
      fontFamily: "monospace",
      lineHeight: theme.typography.body + 4,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    buttonText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    loadingContainer: {
      padding: theme.spacing.md,
      alignItems: "center",
    },
    noReportsText: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
  });
