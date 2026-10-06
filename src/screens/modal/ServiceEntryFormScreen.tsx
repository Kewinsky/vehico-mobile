import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  SERVICE_ENTRY_CATEGORY_OPTIONS,
  buildServiceEntryPayloads,
  canSaveServiceEntry,
  serviceEntryFieldErrors,
  type ServiceEntryFormMode,
  type ServiceEntryFormState,
  type ServiceEntryRowState,
} from "../../forms/serviceEntryForm";
import type {
  Attachment,
  ServiceEntryCategory,
  Workshop,
} from "../../types/domain";
import {
  createServiceEntry,
  deleteServiceEntry,
  getServiceEntry,
  updateServiceEntry,
} from "../../services/serviceEntries/serviceEntriesRepo";
import {
  deleteAttachment,
  listAttachments,
  updateAttachmentDisplayName,
  saveAttachmentLocally,
} from "../../services/attachments/attachmentsRepo";
import { getFileNameFromItem } from "../../services/storage/openFileUrl";
import {
  LocalFileNotFoundError,
  openLocalFile,
} from "../../services/storage/openLocalFile";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import {
  SERVICE_ENTRY_PRESETS,
  type ServiceEntryPreset,
} from "../serviceEntryPresets";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { Button } from "../../ui/components/common/Button";
import { FormPresetChips } from "../../ui/components/common/FormPresetChips";
import { openAttachmentSourceAlert } from "../../ui/components/common/sourcePickerAlert";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card } from "../../ui/components/common/Card";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useTheme } from "../../ui/ThemeProvider";
import {
  alertCaughtError,
  getUserFacingErrorMessage,
} from "../../ui/errors/userFacingError";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import { promptAlert } from "../../ui/prompt/promptAlert";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { Textarea } from "../../ui/components/common/Textarea";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { SquarePen, Trash2 } from "lucide-react-native";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../../ui/components/common/SwipeActions";
import {
  analyzeServiceInvoice,
  resolveServiceInvoiceMimeType,
  ServiceInvoiceImportError,
  type ServiceInvoiceExtraction,
} from "../../services/ai/serviceInvoiceImportRepo";
import { buildServiceInvoiceFormDraft } from "../../forms/serviceInvoiceDraft";
import { showPremiumRequiredAlert } from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

const DOCUMENT_ANALYSIS_TIMEOUT_MS = 30_000;
const DOCUMENT_ANALYSIS_MAX_ESTIMATED_PROGRESS = 90;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isPremium, workshopsLimit, freePlanWorkshopIds } = useEntitlements();
  const { vehicleId, entryId } = route.params;
  const { distanceUnitLabel } = useUnitDisplay();
  const { settings } = useUserSettings();
  const currency = settings?.currency ?? "PLN";

  type EntryRow = ServiceEntryRowState;
  type FormMode = ServiceEntryFormMode;
  const [mode, setMode] = useState<FormMode>("single");
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [mileage, setMileage] = useState("");
  const [category, setCategory] = useState<ServiceEntryCategory | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([
    { title: "", cost: "", category: null },
  ]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingAttachment, setSavingAttachment] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<
    { uri: string; mimeType?: string | null; fileName?: string | null }[]
  >([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [workshopSnapshot, setWorkshopSnapshot] = useState<string | null>(null);
  const [defaultMileage, setDefaultMileage] = useState("");
  const [analyzingInvoice, setAnalyzingInvoice] = useState(false);
  const [invoiceAnalysisProgress, setInvoiceAnalysisProgress] = useState(0);
  const [invoiceReviewMessage, setInvoiceReviewMessage] = useState<string | null>(
    null,
  );
  const invoiceAbortController = useRef<AbortController | null>(null);
  const hasInvoiceDraft = useRef(false);

  const formValues = useMemo(
    (): ServiceEntryFormState => ({
      mode,
      serviceDate,
      mileage,
      category,
      entries,
      description,
      workshopId,
      workshopSnapshot,
    }),
    [
      mode,
      serviceDate,
      mileage,
      category,
      entries,
      description,
      workshopId,
      workshopSnapshot,
    ],
  );

  const fieldErrors = useMemo(
    () => serviceEntryFieldErrors(formValues),
    [formValues],
  );

  const canSave = useMemo(() => canSaveServiceEntry(formValues), [formValues]);

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

  const reloadAttachments = useCallback(async (id: string) => {
    setAttachmentsLoading(true);
    try {
      const atts = await listAttachments(id);
      setAttachments(atts);
    } finally {
      setAttachmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const options = isPremium ? undefined : { freePlanWorkshopIds };
    listWorkshops(options).then(setWorkshops);
  }, [isPremium, workshopsLimit, freePlanWorkshopIds]);

  useEffect(() => {
    if (!analyzingInvoice) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const estimatedProgress = Math.min(
        DOCUMENT_ANALYSIS_MAX_ESTIMATED_PROGRESS,
        Math.max(
          1,
          Math.round(
            (elapsed / DOCUMENT_ANALYSIS_TIMEOUT_MS) *
              DOCUMENT_ANALYSIS_MAX_ESTIMATED_PROGRESS,
          ),
        ),
      );
      setInvoiceAnalysisProgress((current) =>
        Math.max(current, estimatedProgress),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [analyzingInvoice]);

  useEffect(() => {
    if (entryId) return;
    void (async () => {
      try {
        const vehicle = await getVehicle(vehicleId);
        const mileageValue =
          vehicle.mileage != null ? String(vehicle.mileage) : "";
        setDefaultMileage(mileageValue);
        if (!hasInvoiceDraft.current) {
          setMileage((prev) => (prev.trim().length ? prev : mileageValue));
        }
      } catch (err: any) {
        toastCaughtError(err, t("common.error"));
      }
    })();
  }, [vehicleId, entryId, t]);

  useEffect(() => {
    if (!entryId) return;
    void (async () => {
      try {
        const e = await getServiceEntry(entryId);
        setServiceDate(e.service_date);
        setMileage(e.mileage != null ? String(e.mileage) : "");
        setCategory((e.category as ServiceEntryCategory | null) ?? "other");
        setEntries([
          {
            title: e.title,
            cost: e.cost != null ? String(e.cost) : "",
            category: (e.category as ServiceEntryCategory | null) ?? "other",
          },
        ]);
        setDescription(e.description ?? "");
        setWorkshopId((e as any).workshop_id ?? null);
        setWorkshopSnapshot((e as any).workshop_snapshot ?? null);
        setMode("single");
        await reloadAttachments(entryId);
      } catch (err: any) {
        toastCaughtError(err, t("common.error"));
      }
    })();
  }, [entryId, reloadAttachments, t]);

  useEffect(
    () => () => {
      invoiceAbortController.current?.abort();
    },
    [],
  );

  const isPickerDisabled = saving || savingAttachment || analyzingInvoice;
  const workshopIds = useMemo(
    () => workshops.map((workshop) => workshop.id),
    [workshops],
  );

  const isMulti = mode === "multi";
  const isMultipleRows = entries.length > 1;

  function updateEntry(index: number, patch: Partial<EntryRow>) {
    setEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, { title: "", cost: "", category: null }]);
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function setFormMode(next: FormMode) {
    if (next === "single") {
      const first = entries[0] ?? { title: "", cost: "", category: null };
      setCategory(first.category ?? category);
      setEntries([first]);
    } else {
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          category: entry.category ?? category,
        })),
      );
    }
    setMode(next);
  }

  async function openAttachment(att: Attachment) {
    if (!att.local_path) {
      toastError(t("common.error"));
      return;
    }
    try {
      await openLocalFile(att.local_path);
    } catch (e: any) {
      toastError(
        e instanceof LocalFileNotFoundError
          ? t("documents.fileNotFound")
          : getUserFacingErrorMessage(e, t("common.error")),
      );
    }
  }

  function confirmDeleteAttachment(att: Attachment) {
    Alert.alert(
      t("attachments.removeAttachmentTitle"),
      t("attachments.removeAttachmentBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAttachment(att);
              setAttachments((prev) => prev.filter((x) => x.id !== att.id));
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
    );
  }

  function handleEditAttachmentName(att: Attachment) {
    promptAlert(
      t("attachments.editAttachmentNameTitle"),
      t("attachments.editAttachmentNameBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (newName: string | undefined) => {
            try {
              await updateAttachmentDisplayName(
                att.id,
                newName?.trim() || null,
              );
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === att.id
                    ? { ...a, display_name: newName?.trim() || null }
                    : a,
                ),
              );
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      att.display_name?.trim() || "",
    );
  }

  function handleEditPendingFileName(
    index: number,
    currentFileName: string | null | undefined,
  ) {
    promptAlert(
      t("attachments.editAttachmentNameTitle"),
      t("attachments.editAttachmentNameBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: (newName: string | undefined) => {
            setPendingFiles((prev) =>
              prev.map((f, i) =>
                i === index ? { ...f, fileName: newName?.trim() || null } : f,
              ),
            );
          },
        },
      ],
      "plain-text",
      currentFileName?.trim() || "",
    );
  }

  function renderAttachmentRightActions(
    item: Attachment,
    progress: Animated.AnimatedInterpolation<number>,
  ) {
    return (
      <SwipeActionsRow
        progress={progress}
        actions={[
          {
            onPress: () => handleEditAttachmentName(item),
            color: theme.colors.accent,
            icon: <SquarePen size={20} color="#000000" />,
          },
          {
            onPress: () => confirmDeleteAttachment(item),
            color: theme.colors.danger,
            icon: <Trash2 size={20} color="#000000" />,
          },
        ]}
      />
    );
  }

  function renderPendingAttachmentRightActions(
    index: number,
    item: { uri: string; mimeType?: string | null; fileName?: string | null },
    progress: Animated.AnimatedInterpolation<number>,
  ) {
    return (
      <SwipeActionsRow
        progress={progress}
        actions={[
          {
            onPress: () => handleEditPendingFileName(index, item.fileName),
            color: theme.colors.accent,
            icon: <SquarePen size={20} color="#000000" />,
          },
          {
            onPress: () => {
              setPendingFiles((prev) => prev.filter((_, i) => i !== index));
            },
            color: theme.colors.danger,
            icon: <Trash2 size={20} color="#000000" />,
          },
        ]}
      />
    );
  }

  function confirmDeleteEntry() {
    if (!entryId) return;
    Alert.alert(t("entryDetail.deleteTitle"), t("entryDetail.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceEntry(entryId);
            navigation.goBack();
          } catch (e: any) {
            toastCaughtError(e, t("common.error"));
          }
        },
      },
    ]);
  }

  function applyPreset(preset: ServiceEntryPreset) {
    hasInvoiceDraft.current = false;
    if (mode !== "single") {
      setFormMode("single");
    }
    setCategory(preset.category);
    setEntries([
      {
        title: t(`reminderForm.${preset.titleKey}`),
        cost: "",
        category: preset.category,
      },
    ]);
    setMileage(defaultMileage);
    setServiceDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setWorkshopId(null);
    setWorkshopSnapshot(null);
    setPendingFiles([]);
  }

  const presetChipItems = useMemo(
    () =>
      SERVICE_ENTRY_PRESETS.map((preset) => ({
        id: preset.titleKey,
        title: t(`reminderForm.${preset.titleKey}`),
        summaryLines: [
          t(`entryForm.categories.${preset.category}` as any),
        ],
      })),
    [t],
  );

  function clearForm() {
    hasInvoiceDraft.current = false;
    setMode("single");
    resetFieldErrors();
    const today = new Date().toISOString().slice(0, 10);
    setServiceDate(today);
    setMileage(defaultMileage);
    setCategory(null);
    setEntries([{ title: "", cost: "", category: null }]);
    setDescription("");
    setWorkshopId(null);
    setWorkshopSnapshot(null);
    setPendingFiles([]);
    setInvoiceReviewMessage(null);
  }

  const applyInvoiceExtraction = useCallback(
    (
      extraction: ServiceInvoiceExtraction,
      strategy: "combined" | "separate",
    ) => {
      const draft = buildServiceInvoiceFormDraft(
        extraction,
        strategy,
        t("entryForm.invoiceCombinedTitle"),
        currency,
      );
      hasInvoiceDraft.current = true;
      setMode(draft.mode);
      setCategory(draft.category);
      setEntries(draft.entries);
      setDescription(draft.description);
      setServiceDate(draft.serviceDate ?? "");
      setMileage(draft.mileage ?? "");

      const matchingWorkshop = draft.workshopName
        ? workshops.find(
            (workshop) =>
              workshop.name.trim().toLocaleLowerCase() ===
              draft.workshopName?.trim().toLocaleLowerCase(),
          )
        : null;
      setWorkshopId(matchingWorkshop?.id ?? null);
      setWorkshopSnapshot(draft.workshopName);
      resetFieldErrors();

      const uncertainFields = [
        extraction.serviceDate.status !== "recognized"
          ? t("entryForm.serviceDate")
          : null,
        extraction.mileage.status !== "recognized"
          ? t("entryForm.mileage")
          : null,
        extraction.workshopName.status !== "recognized"
          ? t("entryForm.workshop")
          : null,
        extraction.totalCost.status !== "recognized"
          ? t("entryForm.invoiceTotalCost")
          : null,
        extraction.currency.status !== "recognized"
          ? t("entryForm.invoiceCurrency")
          : null,
        ...extraction.works.flatMap((work, index) => [
          work.categoryStatus !== "recognized"
            ? t("entryForm.invoiceWorkField", {
                index: index + 1,
                field: t("entryForm.category"),
              })
            : null,
          work.cost.status !== "recognized"
            ? t("entryForm.invoiceWorkField", {
                index: index + 1,
                field: t("entryForm.invoiceCost"),
              })
            : null,
        ]),
      ].filter((value): value is string => value !== null);
      setInvoiceReviewMessage(
        t("entryForm.invoiceReviewMessage", {
          currency: extraction.currency.value ?? t("entryForm.invoiceCurrencyUnknown"),
          formCurrency: currency,
          fields:
            uncertainFields.length > 0
              ? `• ${uncertainFields.join("\n• ")}`
              : `• ${t("entryForm.invoiceNoUncertainFields")}`,
        }),
      );
    },
    [currency, resetFieldErrors, t, workshops],
  );

  const chooseInvoiceStrategy = useCallback(
    (extraction: ServiceInvoiceExtraction) =>
      new Promise<"combined" | "separate" | null>((resolve) => {
        if (extraction.works.length === 1) {
          resolve("combined");
          return;
        }
        Alert.alert(
          t("entryForm.invoiceMultipleTitle"),
          t("entryForm.invoiceMultipleBody", {
            count: extraction.works.length,
          }),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => resolve(null),
            },
            {
              text: t("entryForm.invoiceSeparateAction"),
              onPress: () => resolve("separate"),
            },
            {
              text: t("entryForm.invoiceCombinedAction"),
              onPress: () => resolve("combined"),
            },
          ],
          { cancelable: false },
        );
      }),
    [t],
  );

  const confirmInvoiceProcessing = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        Alert.alert(
          t("entryForm.invoicePrivacyTitle"),
          t("entryForm.invoicePrivacyBody"),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: t("common.continue"),
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false },
        );
      }),
    [t],
  );

  const handleImportDocument = useCallback(async (asset: {
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
      const mimeType = resolveServiceInvoiceMimeType(asset.mimeType, asset.name);
      if (!mimeType) {
        throw new ServiceInvoiceImportError(
          "INVALID_FILE",
          t("entryForm.invoiceUnsupportedFile"),
        );
      }
      if (!(await confirmInvoiceProcessing())) return;

      invoiceAbortController.current?.abort();
      const controller = new AbortController();
      invoiceAbortController.current = controller;
      setInvoiceAnalysisProgress(1);
      setAnalyzingInvoice(true);
      const extraction = await analyzeServiceInvoice({
        vehicleId,
        fileUri: asset.uri,
        mimeType,
        fileSize: asset.size,
        signal: controller.signal,
      });
      setInvoiceAnalysisProgress(100);
      const strategy = await chooseInvoiceStrategy(extraction);
      if (strategy) {
        applyInvoiceExtraction(extraction, strategy);
        setPendingFiles((previous) => [
          ...previous,
          {
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileName: asset.name,
          },
        ]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message =
        error instanceof ServiceInvoiceImportError &&
        error.code === "FILE_TOO_LARGE"
          ? t("entryForm.invoiceFileTooLarge")
          : error instanceof ServiceInvoiceImportError &&
              error.code === "INVALID_FILE"
            ? t("entryForm.invoiceInvalidFile")
            : error instanceof ServiceInvoiceImportError
              ? t("entryForm.invoiceAnalysisFailed")
              : getUserFacingErrorMessage(
                  error,
                  t("entryForm.invoiceAnalysisFailed"),
                );
      Alert.alert(t("common.error"), message);
    } finally {
      setAnalyzingInvoice(false);
      invoiceAbortController.current = null;
    }
  }, [
    applyInvoiceExtraction,
    chooseInvoiceStrategy,
    confirmInvoiceProcessing,
    isPremium,
    navigation,
    t,
    vehicleId,
  ]);

  async function importDocumentFromCamera() {
    if (!isPremium) {
      showPremiumRequiredAlert(t, navigation);
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error(t("attachments.cameraPermissionDenied"));
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportDocument({
        uri: asset.uri,
        name:
          asset.fileName ??
          asset.uri.split("/").pop() ??
          "service-document.jpg",
        mimeType: asset.mimeType,
        size: asset.fileSize,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function importDocumentFromGallery() {
    if (!isPremium) {
      showPremiumRequiredAlert(t, navigation);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportDocument({
        uri: asset.uri,
        name:
          asset.fileName ??
          asset.uri.split("/").pop() ??
          "service-document.jpg",
        mimeType: asset.mimeType,
        size: asset.fileSize,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function importDocumentFromFiles() {
    if (!isPremium) {
      showPremiumRequiredAlert(t, navigation);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/heic",
          "image/heif",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await handleImportDocument({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      });
    } catch (error) {
      alertCaughtError(t("common.error"), error, t("common.error"));
    }
  }

  async function pickFromCamera() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));

      if (entryId) {
        setSavingAttachment(true);
        await saveAttachmentLocally({
          serviceEntryId: entryId,
          vehicleId,
          fileUri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        await reloadAttachments(entryId);
      } else {
        setPendingFiles((prev) => [
          ...prev,
          {
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileName: asset.fileName,
          },
        ]);
      }
    } catch (e: any) {
      alertCaughtError(t("common.error"), e, t("common.error"));
    } finally {
      setSavingAttachment(false);
    }
  }

  async function pickFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));

      if (entryId) {
        setSavingAttachment(true);
        await saveAttachmentLocally({
          serviceEntryId: entryId,
          vehicleId,
          fileUri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        await reloadAttachments(entryId);
      } else {
        setPendingFiles((prev) => [
          ...prev,
          {
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileName: asset.fileName,
          },
        ]);
      }
    } catch (e: any) {
      alertCaughtError(t("common.error"), e, t("common.error"));
    } finally {
      setSavingAttachment(false);
    }
  }

  async function pickFromFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));

      if (entryId) {
        setSavingAttachment(true);
        await saveAttachmentLocally({
          serviceEntryId: entryId,
          vehicleId,
          fileUri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.name,
        });
        await reloadAttachments(entryId);
      } else {
        setPendingFiles((prev) => [
          ...prev,
          { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.name },
        ]);
      }
    } catch (e: any) {
      alertCaughtError(t("common.error"), e, t("common.error"));
    } finally {
      setSavingAttachment(false);
    }
  }

  async function onSave() {
    if (!validateBeforeSave()) return;
    try {
      setSaving(true);
      const workshopName =
        workshopId != null
          ? (workshops.find((w) => w.id === workshopId)?.name ??
            workshopSnapshot)
          : workshopSnapshot;
      const payloads = buildServiceEntryPayloads(
        vehicleId,
        formValues,
        workshopName,
      );
      const firstPayload = payloads[0];
      if (!firstPayload) throw new Error("Invalid service entry form");

      if (entryId) {
        await updateServiceEntry(entryId, firstPayload);
        for (const payload of payloads.slice(1)) {
          await createServiceEntry(payload);
        }
      } else {
        const createdEntries = [await createServiceEntry(firstPayload)];
        for (const payload of payloads.slice(1)) {
          createdEntries.push(await createServiceEntry(payload));
        }
        if (pendingFiles.length) {
          setSavingAttachment(true);
          for (const created of createdEntries) {
            for (const file of pendingFiles) {
              await saveAttachmentLocally({
                serviceEntryId: created.id,
                vehicleId,
                fileUri: file.uri,
                mimeType: file.mimeType,
                fileName: file.fileName,
              });
            }
          }
        }
      }

      navigation.goBack();
    } catch (e: any) {
      alertCaughtError(t("common.error"), e, t("common.error"));
    } finally {
      setSaving(false);
      setSavingAttachment(false);
    }
  }

  return (
    <ModalLayout
      title={entryId ? t("entryForm.editTitle") : t("entryForm.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: isPickerDisabled,
        loading: saving || savingAttachment,
      }}
      useHorizontalContentInset={false}
      footer={
        <View style={styles.footerAction}>
          {entryId ? (
            <Button variant="destructive" onPress={confirmDeleteEntry}>
              {t("common.delete")}
            </Button>
          ) : (
            <Button variant="outlined" onPress={clearForm} disabled={saving}>
              {t("common.clearButton")}
            </Button>
          )}
        </View>
      }
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView>
          {!entryId ? (
            <>
              <View style={styles.insetContent}>
                <Button
                  variant="ghost"
                  disabled={isPickerDisabled}
                  onPress={() => {
                    openAttachmentSourceAlert(
                      {
                        onCamera: () => void importDocumentFromCamera(),
                        onPhotos: () => void importDocumentFromGallery(),
                        onFiles: () => void importDocumentFromFiles(),
                      },
                      t,
                      t("entryForm.importInvoice"),
                    );
                  }}
                >
                  {analyzingInvoice
                    ? t("entryForm.invoiceAnalyzing")
                    : t("entryForm.importInvoice")}
                </Button>
                {analyzingInvoice ? (
                  <View
                    style={styles.analysisProgress}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={t(
                      "entryForm.invoiceAnalysisProgressLabel",
                    )}
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: invoiceAnalysisProgress,
                    }}
                  >
                    <View style={styles.analysisProgressHeader}>
                      <Text
                        style={[
                          styles.analysisProgressLabel,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {t("entryForm.invoiceAnalysisProgressLabel")}
                      </Text>
                      <Text
                        style={[
                          styles.analysisProgressValue,
                          { color: theme.colors.fg },
                        ]}
                      >
                        {invoiceAnalysisProgress}%
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
                            width: `${invoiceAnalysisProgress}%` as `${number}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : (
                  <Text
                    style={[styles.noticeText, { color: theme.colors.muted }]}
                  >
                    {t("entryForm.importInvoiceHint")}
                  </Text>
                )}
              </View>
              <View style={{ height: theme.spacing.sm }} />

              {invoiceReviewMessage ? (
                <>
                  <Card style={styles.card}>
                    <View style={styles.invoiceReview}>
                      <Text
                        style={[
                          styles.invoiceReviewText,
                          { color: theme.colors.fg },
                        ]}
                      >
                        {invoiceReviewMessage}
                      </Text>
                    </View>
                  </Card>
                  <View style={{ height: theme.spacing.sm }} />
                </>
              ) : null}

              <View style={styles.segmentTabs}>
                <SegmentTabs<"single" | "multi">
                  variant="secondary"
                  value={mode}
                  options={[
                    { value: "single", label: t("entryForm.modeSingle") },
                    { value: "multi", label: t("entryForm.modeMulti") },
                  ]}
                  onChange={setFormMode}
                />
              </View>
              <View style={{ height: theme.spacing.sm }} />

              {!isMulti ? (
                <FormPresetChips
                  sectionTitle={t("entryForm.presetsTitle")}
                  items={presetChipItems}
                  onSelect={(id) => {
                    const preset = SERVICE_ENTRY_PRESETS.find(
                      (p) => p.titleKey === id,
                    );
                    if (preset) applyPreset(preset);
                  }}
                />
              ) : null}
            </>
          ) : null}

          <Card style={styles.card}>
            <FormDateRow
              icon="calendar-outline"
              label={t("entryForm.serviceDate")}
              value={serviceDate}
              onChange={setServiceDate}
              disabled={isPickerDisabled}
              error={fieldError(fieldErrors.serviceDate)}
            />

            {!isMulti ? (
              <FormPickerRow<ServiceEntryCategory>
                icon="pricetag-outline"
                label={t("entryForm.category")}
                value={category}
                options={SERVICE_ENTRY_CATEGORY_OPTIONS}
                getLabel={(value) => t(`entryForm.categories.${value}` as any)}
                onChange={setCategory}
                placeholderLabel={t("entryForm.categoryPlaceholder")}
                disabled={isPickerDisabled}
                error={fieldError(fieldErrors.category)}
              />
            ) : null}

            <FormPickerRow<string>
              icon="business-outline"
              label={t("entryForm.workshop")}
              value={workshopId}
              options={workshopIds}
              getLabel={(id) =>
                workshops.find((workshop) => workshop.id === id)?.name ?? ""
              }
              onChange={(selectedId) => {
                setWorkshopId(selectedId);
                setWorkshopSnapshot(
                  selectedId
                    ? (workshops.find((workshop) => workshop.id === selectedId)
                        ?.name ?? workshopSnapshot)
                    : null,
                );
              }}
              placeholderLabel={t("entryForm.workshopPlaceholder")}
              disabled={isPickerDisabled}
            />

            {invoiceReviewMessage && !workshopId ? (
              <FormInputRow
                icon="business-outline"
                label={t("entryForm.invoiceWorkshop")}
                value={workshopSnapshot ?? ""}
                onChangeText={(value) => setWorkshopSnapshot(value || null)}
                editable={!isPickerDisabled}
                placeholder={t("entryForm.workshopPlaceholder")}
              />
            ) : null}

            <FormInputRow
              icon="speedometer-outline"
              label={`${t("entryForm.mileage")} (${distanceUnitLabel})`}
              value={mileage}
              onChangeText={setMileage}
              decimal
              keyboardType="decimal-pad"
              editable={!isPickerDisabled}
              placeholder={t("entryForm.placeholderMileage")}
              error={fieldError(fieldErrors.mileage)}
            />
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          {isMulti ? (
            <>
              {entries.map((row, index) => (
                <View key={index}>
                  <Card style={styles.card}>
                    <FormPickerRow<ServiceEntryCategory>
                      icon="pricetag-outline"
                      label={t("entryForm.category")}
                      value={row.category}
                      options={SERVICE_ENTRY_CATEGORY_OPTIONS}
                      getLabel={(value) =>
                        t(`entryForm.categories.${value}` as any)
                      }
                      onChange={(value) =>
                        updateEntry(index, { category: value })
                      }
                      placeholderLabel={t("entryForm.categoryPlaceholder")}
                      disabled={isPickerDisabled}
                      error={fieldError(
                        fieldErrors.entryCategories[index] ?? false,
                      )}
                    />
                    <FormInputRow
                      icon="document-text-outline"
                      label={t("entryForm.entryTitle")}
                      value={row.title}
                      onChangeText={(text) =>
                        updateEntry(index, { title: text })
                      }
                      editable={!isPickerDisabled}
                      placeholder={t("entryForm.placeholderTitle")}
                      error={fieldError(
                        fieldErrors.entryTitles[index] ?? false,
                      )}
                    />
                    <FormInputRow
                      icon="cash-outline"
                      label={t("entryForm.cost", { unit: currency })}
                      value={row.cost}
                      onChangeText={(text) =>
                        updateEntry(index, { cost: text })
                      }
                      decimal
                      keyboardType="decimal-pad"
                      editable={!isPickerDisabled}
                      placeholder={t("entryForm.placeholderCost")}
                      error={fieldError(fieldErrors.entryCosts[index] ?? false)}
                      trailing={
                        isMultipleRows && (!entryId || index > 0) ? (
                          <Pressable
                            onPress={() => removeEntry(index)}
                            hitSlop={10}
                            style={({ pressed }) => [
                              styles.inlineTrash,
                              pressed && { opacity: 0.75 },
                            ]}
                          >
                            <Trash2 size={20} color={theme.colors.danger} />
                          </Pressable>
                        ) : null
                      }
                    />
                  </Card>
                  {index < entries.length - 1 ? (
                    <View style={{ height: theme.spacing.sm }} />
                  ) : null}
                </View>
              ))}

              <View style={{ height: theme.spacing.sm }} />
              <View style={styles.insetContent}>
                <Button
                  onPress={addEntry}
                  variant="ghost"
                  disabled={isPickerDisabled}
                >
                  {t("entryForm.addAnotherEntry")}
                </Button>
                <Text
                  style={[styles.noticeText, { color: theme.colors.muted }]}
                >
                  {pendingFiles.length > 0
                    ? t("entryForm.documentWillAttachToEntries", {
                        count: pendingFiles.length,
                      })
                    : t("entryForm.multiModeInfo")}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Card style={styles.card}>
                <FormInputRow
                  icon="document-text-outline"
                  label={t("entryForm.entryTitle")}
                  value={entries[0]?.title ?? ""}
                  onChangeText={(text) => updateEntry(0, { title: text })}
                  editable={!isPickerDisabled}
                  placeholder={t("entryForm.placeholderTitle")}
                  error={fieldError(fieldErrors.entryTitles[0] ?? false)}
                />
                <FormInputRow
                  icon="cash-outline"
                  label={t("entryForm.cost", { unit: currency })}
                  value={entries[0]?.cost ?? ""}
                  onChangeText={(text) => updateEntry(0, { cost: text })}
                  decimal
                  keyboardType="decimal-pad"
                  editable={!isPickerDisabled}
                  placeholder={t("entryForm.placeholderCost")}
                  error={fieldError(fieldErrors.entryCosts[0] ?? false)}
                />
              </Card>

              <View style={{ height: theme.spacing.sm }} />
              <Card style={styles.card}>
                <View
                  style={{
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                  }}
                >
                  <View style={styles.rowLeft}>
                    <SquarePen size={20} color={theme.colors.accent} />
                    <Text
                      style={[styles.label, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {t("entryForm.description")}
                    </Text>
                  </View>
                  <Textarea
                    value={description}
                    onChangeText={setDescription}
                    editable={!isPickerDisabled}
                    multiline
                    placeholder={t("entryForm.placeholderDescription")}
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      styles.inputMultiline,
                      { color: theme.colors.fg, paddingTop: theme.spacing.xs },
                    ]}
                  />
                </View>
              </Card>

              <View style={{ height: theme.spacing.xl }} />
              <View style={[styles.sectionHeader, styles.insetContent]}>
                <Text style={styles.h2}>
                  {t("attachments.titleWithCount", {
                    count: entryId ? attachments.length : pendingFiles.length,
                  })}
                </Text>
              </View>
              <View style={{ height: theme.spacing.sm }} />
              <View style={styles.insetContent}>
                <Button
                  variant="ghost"
                  disabled={isPickerDisabled}
                  onPress={() => {
                    openAttachmentSourceAlert(
                      {
                        onCamera: () => void pickFromCamera(),
                        onPhotos: () => void pickFromGallery(),
                        onFiles: () => void pickFromFiles(),
                      },
                      t,
                    );
                  }}
                >
                  {t("entryForm.addAttachment")}
                </Button>
              </View>
              <View style={{ height: theme.spacing.sm }} />

              {entryId ? (
                <FlatList
                  data={attachments}
                  keyExtractor={(a) => a.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: theme.spacing.sm }} />
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.listRowWrap}>
                      <ExclusiveSwipeable
                        renderRightActions={(progress) =>
                          renderAttachmentRightActions(item, progress)
                        }
                        rightThreshold={32}
                      >
                        <ListRowWithActions
                          compact
                          title={
                            item.display_name?.trim() ||
                            t("attachments.attachmentLabel")
                          }
                          subtitle={(() => {
                            const fileName = getFileNameFromItem(item);
                            const ext =
                              fileName.split(".").pop()?.toUpperCase() ||
                              "FILE";
                            const date = new Date(item.created_at);
                            const formattedDate = date.toLocaleDateString(
                              i18n.language === "pl" ? "pl-PL" : "en-US",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            );
                            return `${t("documents.added")} ${formattedDate} · ${ext}`;
                          })()}
                          onPress={() => void openAttachment(item)}
                        />
                      </ExclusiveSwipeable>
                    </View>
                  )}
                  ListEmptyComponent={
                    attachmentsLoading ? (
                      <View style={styles.loadingContainer}>
                        <LoadingIndicator />
                      </View>
                    ) : !savingAttachment && attachments.length === 0 ? (
                      <Text style={[styles.muted, styles.insetContent]}>
                        {t("entryForm.attachmentsEmpty")}
                      </Text>
                    ) : null
                  }
                />
              ) : (
                <FlatList
                  showsVerticalScrollIndicator={false}
                  data={pendingFiles}
                  keyExtractor={(_, index) => `pending-${index}`}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: theme.spacing.sm }} />
                  )}
                  renderItem={({ item, index }) => (
                    <View style={styles.listRowWrap}>
                      <ExclusiveSwipeable
                        renderRightActions={(progress) =>
                          renderPendingAttachmentRightActions(
                            index,
                            item,
                            progress,
                          )
                        }
                        rightThreshold={32}
                      >
                        <ListRowWithActions
                          compact
                          title={
                            item.fileName?.trim() ||
                            t("attachments.attachmentLabel")
                          }
                        />
                      </ExclusiveSwipeable>
                    </View>
                  )}
                />
              )}
              <View style={{ height: theme.spacing.xl }} />
            </>
          )}
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    segmentTabs: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
    },
    card: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
    },
    invoiceReview: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    invoiceReviewText: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
    },
    analysisProgress: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    analysisProgressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    analysisProgressLabel: {
      flex: 1,
      flexShrink: 1,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
    },
    analysisProgressValue: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      fontVariant: ["tabular-nums"],
    },
    analysisProgressTrack: {
      height: 6,
      borderRadius: 999,
      overflow: "hidden",
    },
    analysisProgressFill: {
      height: "100%",
      borderRadius: 999,
    },
    insetContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    listRowWrap: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
    },
    footerAction: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    h2: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    sectionHeader: { gap: theme.spacing.sm / 2 },
    muted: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    noticeText: {
      marginTop: theme.spacing.sm / 2,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
      color: theme.colors.muted,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
    },
    rowRight: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    rowMultiline: { alignItems: "flex-start" },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    inputMultiline: {
      minHeight: 96,
      paddingTop: 2,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    inlineTrash: { paddingLeft: theme.spacing.sm / 2, paddingVertical: 2 },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    cardMeta: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
    attachmentCard: {
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
