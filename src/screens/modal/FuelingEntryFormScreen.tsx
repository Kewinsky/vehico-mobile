import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  FUEL_TYPE_OPTIONS,
  GAS_STATION_OPTIONS,
  buildFuelingEntryPayload,
  canSaveFuelingEntry,
  fuelingEntryFieldErrors,
  type FuelingEntryFormState,
} from "../../forms/fuelingEntryForm";
import type { FuelGrade, GasStation } from "../../types/domain";
import {
  createFuelingEntry,
  deleteFuelingEntry,
  getFuelingEntry,
  listFuelingEntries,
  updateFuelingEntry,
} from "../../services/fuel/fuelingEntriesRepo";
import { Button } from "../../ui/components/common/Button";
import {
  AiImportReviewCard,
  type AiImportReviewTone,
} from "../../ui/components/common/AiImportReviewCard";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card } from "../../ui/components/common/Card";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { useTheme } from "../../ui/ThemeProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastCaughtError } from "../../ui/toast/toast";
import { Droplet, Fuel } from "lucide-react-native";
import { openAttachmentSourceAlert } from "../../ui/components/common/sourcePickerAlert";
import { showPremiumRequiredAlert } from "../../ui/limits/entitlementAlerts";
import {
  analyzeFuelReceipt,
  FuelReceiptImportError,
  resolveFuelReceiptMimeType,
  type FuelReceiptExtraction,
} from "../../services/ai/fuelReceiptImportRepo";
import { createAiImportRequestId } from "../../services/ai/aiImportIdempotency";
import {
  countAiImportCorrections,
  countAiImportStatuses,
  recordAiImportQuality,
} from "../../services/ai/aiImportQuality";
import { buildFuelReceiptFormDraft } from "../../forms/fuelReceiptDraft";
import {
  alertCaughtError,
  getUserFacingErrorMessage,
} from "../../ui/errors/userFacingError";

type Props = NativeStackScreenProps<AppStackParamList, "FuelingEntryForm">;

const RECEIPT_ANALYSIS_TIMEOUT_MS = 30_000;
const RECEIPT_ANALYSIS_MAX_ESTIMATED_PROGRESS = 90;

export function FuelingEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isPremium } = useEntitlements();
  const { vehicleId, entryId } = route.params;
  const { distanceUnitLabel, fuelUnitShort } = useUnitDisplay();
  const { settings } = useUserSettings();
  const fuelUnitLabel = fuelUnitShort;
  const currency = settings?.currency ?? "PLN";

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelType, setFuelType] = useState<FuelGrade | null>(null);
  const [gasStation, setGasStation] = useState<GasStation | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const [receiptAnalysisProgress, setReceiptAnalysisProgress] = useState(0);
  const [receiptReview, setReceiptReview] = useState<{
    message: string;
    tone: AiImportReviewTone;
  } | null>(null);
  const [hasReceiptDraft, setHasReceiptDraft] = useState(false);
  const receiptAbortController = useRef<AbortController | null>(null);
  const hasReceiptDraftRef = useRef(false);
  const receiptSaveRequestId = useRef<string | null>(null);
  const receiptExtraction = useRef<FuelReceiptExtraction | null>(null);

  const formValues = useMemo(
    (): FuelingEntryFormState => ({
      date,
      distance,
      fuelAmount,
      fuelCost,
      fuelType,
      gasStation,
    }),
    [date, distance, fuelAmount, fuelCost, fuelType, gasStation],
  );

  const fieldErrors = useMemo(
    () => fuelingEntryFieldErrors(formValues, { requireDistance: hasReceiptDraft }),
    [formValues, hasReceiptDraft],
  );

  const canSave = useMemo(
    () => canSaveFuelingEntry(formValues, { requireDistance: hasReceiptDraft }),
    [formValues, hasReceiptDraft],
  );

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

  const load = useCallback(async () => {
    if (entryId) {
      try {
        const entry = await getFuelingEntry(entryId);
        setDate(entry.date);
        setDistance(entry.distance != null ? String(entry.distance) : "");
        setFuelAmount(String(entry.fuel_amount));
        setFuelCost(String(entry.fuel_cost));
        setFuelType(entry.fuel_type ?? null);
        setGasStation(entry.gas_station ?? null);
      } catch (err: any) {
        toastCaughtError(err, t("common.error"));
      }
      return;
    }

    try {
      const entries = await listFuelingEntries(vehicleId);
      const last = entries[0];
      if (!last || hasReceiptDraftRef.current) return;
      if (last.fuel_type != null) {
        setFuelType((prev) => prev ?? last.fuel_type);
      }
      if (last.gas_station != null) {
        setGasStation((prev) => prev ?? last.gas_station);
      }
    } catch (err: any) {
      toastCaughtError(err, t("common.error"));
    }
  }, [entryId, vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      receiptAbortController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!analyzingReceipt) return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(
        RECEIPT_ANALYSIS_MAX_ESTIMATED_PROGRESS,
        Math.max(1, Math.round((elapsed / RECEIPT_ANALYSIS_TIMEOUT_MS) * 100)),
      );
      setReceiptAnalysisProgress(next);
    }, 500);
    return () => clearInterval(interval);
  }, [analyzingReceipt]);

  function confirmDelete() {
    if (!entryId) return;
    Alert.alert(
      t("fuelCosts.deleteFuelingTitle"),
      t("fuelCosts.deleteFuelingBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFuelingEntry(entryId);
              navigation.goBack();
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
    );
  }

  function clearForm() {
    resetFieldErrors();
    setDate(new Date().toISOString().slice(0, 10));
    setDistance("");
    setFuelAmount("");
    setFuelCost("");
    setFuelType(null);
    setGasStation(null);
    setReceiptReview(null);
    setHasReceiptDraft(false);
    hasReceiptDraftRef.current = false;
    receiptSaveRequestId.current = null;
    receiptExtraction.current = null;
  }

  const applyReceiptExtraction = useCallback(
    (extraction: FuelReceiptExtraction) => {
      const draft = buildFuelReceiptFormDraft(extraction);
      if (draft.date) setDate(draft.date);
      setDistance("");
      setFuelAmount(draft.fuelAmount ?? "");
      setFuelCost(draft.fuelCost ?? "");
      setFuelType(draft.fuelType);
      setGasStation(draft.gasStation ?? "other");
      resetFieldErrors();
      setHasReceiptDraft(true);
      hasReceiptDraftRef.current = true;
      receiptSaveRequestId.current = createAiImportRequestId();
      receiptExtraction.current = extraction;

      const issues = [
        extraction.date.status !== "recognized"
          ? t("fuelingForm.receiptFieldDate")
          : null,
        extraction.fuelAmount.status !== "recognized"
          ? t("fuelingForm.receiptFieldAmount")
          : null,
        extraction.totalCost.status !== "recognized"
          ? t("fuelingForm.receiptFieldCost")
          : null,
        extraction.fuelType.status !== "recognized"
          ? t("fuelingForm.receiptFieldFuelType")
          : null,
        extraction.gasStation.status !== "recognized"
          ? t("fuelingForm.receiptFieldStation")
          : null,
      ].filter((value): value is string => value !== null);
      setReceiptReview(
        issues.length > 0
          ? {
              tone: "review",
              message: t("aiImportReview.issuesMessage", {
                fields: `• ${issues.join("\n• ")}`,
              }),
            }
          : {
              tone: "success",
              message: t("aiImportReview.successMessage"),
            },
      );
    },
    [resetFieldErrors, t],
  );

  const handleImportReceipt = useCallback(async (asset: {
    uri: string;
    name: string;
    mimeType?: string | null;
    size?: number | null;
  }) => {
    if (!isPremium) {
      showPremiumRequiredAlert(t, navigation);
      return;
    }
    try {
      const mimeType = resolveFuelReceiptMimeType(asset.mimeType, asset.name);
      if (!mimeType) {
        throw new FuelReceiptImportError(
          "INVALID_FILE",
          t("fuelingForm.receiptUnsupportedFile"),
        );
      }
      receiptAbortController.current?.abort();
      const controller = new AbortController();
      receiptAbortController.current = controller;
      setReceiptAnalysisProgress(1);
      setAnalyzingReceipt(true);
      const extraction = await analyzeFuelReceipt({
        vehicleId,
        fileUri: asset.uri,
        mimeType,
        fileSize: asset.size,
        signal: controller.signal,
      });
      setReceiptAnalysisProgress(100);
      applyReceiptExtraction(extraction);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message =
        error instanceof FuelReceiptImportError &&
        error.code === "FILE_TOO_LARGE"
          ? t("fuelingForm.receiptFileTooLarge")
          : error instanceof FuelReceiptImportError &&
              error.code === "INVALID_FILE"
            ? t("fuelingForm.receiptInvalidFile")
            : error instanceof FuelReceiptImportError &&
                (error.code === "RATE_LIMITED" ||
                  error.code === "BUDGET_EXCEEDED")
              ? t("aiImportReview.limitReached")
              : error instanceof FuelReceiptImportError &&
                  error.code === "FEATURE_DISABLED"
                ? t("aiImportReview.unavailable")
                : error instanceof FuelReceiptImportError
                  ? t("fuelingForm.receiptAnalysisFailed")
              : getUserFacingErrorMessage(
                  error,
                  t("fuelingForm.receiptAnalysisFailed"),
                );
      Alert.alert(t("common.error"), message);
    } finally {
      setAnalyzingReceipt(false);
      receiptAbortController.current = null;
    }
  }, [
    applyReceiptExtraction,
    isPremium,
    navigation,
    t,
    vehicleId,
  ]);

  async function importReceiptFromCamera() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error(t("attachments.cameraPermissionDenied"));
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportReceipt({
        uri: asset.uri,
        name: asset.fileName ?? asset.uri.split("/").pop() ?? "fuel-receipt.jpg",
        mimeType: asset.mimeType,
        size: asset.fileSize,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function importReceiptFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportReceipt({
        uri: asset.uri,
        name: asset.fileName ?? asset.uri.split("/").pop() ?? "fuel-receipt.jpg",
        mimeType: asset.mimeType,
        size: asset.fileSize,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function importReceiptFromFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/heic", "image/heif"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportReceipt({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function onSave() {
    if (!validateBeforeSave()) return;

    try {
      setSaving(true);
      const payload = buildFuelingEntryPayload(vehicleId, formValues, {
        requireDistance: hasReceiptDraft,
      });
      if (entryId) await updateFuelingEntry(entryId, payload);
      else {
        const idempotencyKey = hasReceiptDraftRef.current
          ? (receiptSaveRequestId.current ??= createAiImportRequestId())
          : undefined;
        await createFuelingEntry(payload, { idempotencyKey });
        const extraction = receiptExtraction.current;
        if (idempotencyKey && extraction) {
          const baseline = buildFuelReceiptFormDraft(extraction);
          await recordAiImportQuality({
            feature: "fuel_receipt_import",
            requestId: idempotencyKey,
            statusCounts: countAiImportStatuses([
              extraction.date.status,
              extraction.fuelAmount.status,
              extraction.totalCost.status,
              extraction.fuelType.status,
              extraction.gasStation.status,
            ]),
            correctionCount: countAiImportCorrections(
              [
                baseline.date,
                baseline.fuelAmount,
                baseline.fuelCost,
                baseline.fuelType,
                baseline.gasStation,
              ],
              [date, fuelAmount, fuelCost, fuelType, gasStation],
            ),
            categoryCorrectionCount: 0,
          });
        }
      }
      navigation.goBack();
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalLayout
      title={entryId ? t("fuelingForm.editTitle") : t("fuelingForm.addTitle")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving || analyzingReceipt,
        loading: saving,
      }}
      footer={
        entryId ? (
          <Button variant="destructive" onPress={confirmDelete}>
            {t("common.delete")}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onPress={clearForm}
            disabled={saving || analyzingReceipt}
          >
            {t("common.clearButton")}
          </Button>
        )
      }
    >
      <FormScreen noLayout scrollView={false}>
        <NativeHeaderScrollView>
          {!entryId ? (
            <>
              <View style={styles.importSection}>
                <Button
                  variant="ghost"
                  disabled={saving || analyzingReceipt}
                  onPress={() => {
                    if (!isPremium) {
                      showPremiumRequiredAlert(t, navigation);
                      return;
                    }
                    openAttachmentSourceAlert(
                      {
                        onCamera: () => void importReceiptFromCamera(),
                        onPhotos: () => void importReceiptFromGallery(),
                        onFiles: () => void importReceiptFromFiles(),
                      },
                      t,
                      t("fuelingForm.importReceipt"),
                    );
                  }}
                >
                  {analyzingReceipt
                    ? t("fuelingForm.receiptAnalyzing")
                    : t("fuelingForm.importReceipt")}
                </Button>
                {analyzingReceipt ? (
                  <View
                    style={styles.analysisProgress}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={t(
                      "fuelingForm.receiptAnalysisProgressLabel",
                    )}
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: receiptAnalysisProgress,
                    }}
                  >
                    <View style={styles.analysisProgressHeader}>
                      <Text style={{ color: theme.colors.muted }}>
                        {t("fuelingForm.receiptAnalysisProgressLabel")}
                      </Text>
                      <Text style={{ color: theme.colors.fg }}>
                        {receiptAnalysisProgress}%
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.analysisProgressTrack,
                        { backgroundColor: theme.colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.analysisProgressFill,
                          {
                            backgroundColor: theme.colors.accent,
                            width: `${receiptAnalysisProgress}%` as `${number}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.hint, { color: theme.colors.muted }]}>
                    {t("fuelingForm.importReceiptHint")}
                  </Text>
                )}
              </View>
              <View style={{ height: theme.spacing.sm }} />
              {receiptReview ? (
                <>
                  <AiImportReviewCard
                    message={receiptReview.message}
                    tone={receiptReview.tone}
                  />
                  <View style={{ height: theme.spacing.sm }} />
                </>
              ) : null}
            </>
          ) : null}
          <Card>
            <FormDateRow
              icon="calendar-outline"
              label={t("fuelingForm.date")}
              value={date}
              onChange={setDate}
              disabled={saving || analyzingReceipt}
              error={fieldError(fieldErrors.date)}
            />

            <FormPickerRow<FuelGrade>
              iconComponent={<Fuel size={20} color={theme.colors.accent} />}
              label={t("fuelingForm.fuelType")}
              value={fuelType}
              options={FUEL_TYPE_OPTIONS}
              getLabel={(value) => t(`fuelingForm.fuelTypes.${value}`)}
              onChange={setFuelType}
              placeholderLabel={t("fuelingForm.fuelPlaceholder")}
              disabled={saving || analyzingReceipt}
            />

            <FormPickerRow<GasStation>
              icon="location-outline"
              label={t("fuelingForm.gasStation")}
              value={gasStation}
              options={GAS_STATION_OPTIONS}
              getLabel={(value) => t(`fuelingForm.stations.${value}`)}
              onChange={setGasStation}
              placeholderLabel={t("fuelingForm.gasStationPlaceholder")}
              disabled={saving || analyzingReceipt}
            />
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          <Card>
            <FormInputRow
              icon="speedometer-outline"
              label={t("fuelingForm.distance", { unit: distanceUnitLabel })}
              value={distance}
              onChangeText={setDistance}
              decimal
              keyboardType="decimal-pad"
              editable={!saving && !analyzingReceipt}
              placeholder={t("fuelingForm.placeholderDistance")}
              error={fieldError(fieldErrors.distance)}
            />

            <FormInputRow
              iconComponent={<Droplet size={20} color={theme.colors.accent} />}
              label={t("fuelingForm.fuelAmount", { unit: fuelUnitLabel })}
              value={fuelAmount}
              onChangeText={setFuelAmount}
              decimal
              keyboardType="decimal-pad"
              editable={!saving && !analyzingReceipt}
              placeholder={t("fuelingForm.placeholderFuelAmount")}
              error={fieldError(fieldErrors.fuelAmount)}
            />

            <FormInputRow
              icon="card-outline"
              label={t("fuelingForm.cost", { unit: currency })}
              value={fuelCost}
              onChangeText={setFuelCost}
              decimal
              keyboardType="decimal-pad"
              editable={!saving && !analyzingReceipt}
              placeholder={t("fuelingForm.placeholderCost")}
              error={fieldError(fieldErrors.fuelCost)}
            />
          </Card>
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    importSection: {
      gap: theme.spacing.sm,
    },
    hint: {
      fontSize: theme.typography.caption,
      lineHeight: theme.typography.caption + 5,
      paddingHorizontal: theme.spacing.sm,
    },
    analysisProgress: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    analysisProgressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    analysisProgressTrack: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    analysisProgressFill: {
      height: "100%",
      borderRadius: 3,
    },
  });
