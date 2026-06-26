import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
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
  buildServiceEntryBasePayload,
  buildServiceEntryRowPayload,
  canSaveServiceEntry,
  serviceEntryFieldErrors,
  type ServiceEntryFormMode,
  type ServiceEntryFormState,
  type ServiceEntryRowState,
} from "../../forms/serviceEntryForm";
import type { Attachment, ServiceEntryCategory, Workshop } from "../../types/domain";
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
  uploadAttachment,
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
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { Ionicons } from "@expo/vector-icons";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { Textarea } from "../../ui/components/common/Textarea";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { SquarePen, Trash2 } from "lucide-react-native";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../../ui/components/common/SwipeActions";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isPremium, workshopsLimit, freePlanWorkshopIds } = useEntitlements();
  const { vehicleId, entryId } = route.params as any;
  const { distanceUnitLabel } = useUnitDisplay();

  type EntryRow = ServiceEntryRowState;
  type FormMode = ServiceEntryFormMode;
  const [mode, setMode] = useState<FormMode>("single");
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [mileage, setMileage] = useState("");
  const [category, setCategory] = useState<ServiceEntryCategory | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([{ title: "", cost: "" }]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<
    { uri: string; mimeType?: string | null; fileName?: string | null }[]
  >([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [workshopSnapshot, setWorkshopSnapshot] = useState<string | null>(null);
  const [defaultMileage, setDefaultMileage] = useState("");

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

  const canSave = useMemo(
    () => canSaveServiceEntry(formValues),
    [formValues],
  );

  const { fieldError, validateBeforeSave, resetFieldErrors } =
    useFormFieldErrors(canSave);

  const checkAndUpload = useCallback(
    async (params: {
      serviceEntryId: string;
      vehicleId: string;
      fileUri: string;
      mimeType?: string | null;
      fileName?: string | null;
    }) => {
      await uploadAttachment(params);
    },
    [],
  );

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
    if (entryId) return;
    void (async () => {
      try {
        const vehicle = await getVehicle(vehicleId);
        const mileageValue =
          vehicle.mileage != null ? String(vehicle.mileage) : "";
        setDefaultMileage(mileageValue);
        setMileage((prev) => (prev.trim().length ? prev : mileageValue));
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
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
          },
        ]);
        setDescription(e.description ?? "");
        setWorkshopId((e as any).workshop_id ?? null);
        setWorkshopSnapshot((e as any).workshop_snapshot ?? null);
        setMode("single");
        await reloadAttachments(entryId);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      }
    })();
  }, [entryId, reloadAttachments, t]);

  const isMulti = mode === "multi";
  const isMultipleRows = entries.length > 1;

  function updateEntry(index: number, patch: Partial<EntryRow>) {
    setEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, { title: "", cost: "" }]);
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function setFormMode(next: FormMode) {
    if (next === "single") {
      setEntries((prev) => [prev[0] ?? { title: "", cost: "" }]);
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
          : (e?.message ?? t("common.error")),
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
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }

  function handleEditAttachmentName(att: Attachment) {
    Alert.prompt(
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
              toastError(e?.message ?? t("common.error"));
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
    Alert.prompt(
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

  function showPicker<T extends string>(opts: {
    title: string;
    value: T | null;
    options: readonly T[];
    getLabel: (v: T) => string;
    onChange: (v: T | null) => void;
    placeholderLabel?: string;
  }) {
    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }[] = [{ text: t("common.cancel"), style: "cancel" }];

    if (opts.placeholderLabel) {
      buttons.push({
        text: opts.placeholderLabel,
        onPress: () => opts.onChange(null),
      });
    }

    opts.options.forEach((opt) => {
      buttons.push({
        text: opts.getLabel(opt),
        onPress: () => opts.onChange(opt),
      });
    });

    Alert.alert(opts.title, t("common.chooseOption"), buttons, {
      cancelable: true,
    });
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
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  function applyPreset(preset: ServiceEntryPreset) {
    if (mode !== "single") {
      setFormMode("single");
    }
    setCategory(preset.category);
    setEntries([{ title: t(`reminderForm.${preset.titleKey}`), cost: "" }]);
    setMileage(defaultMileage);
    setServiceDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setWorkshopId(null);
    setWorkshopSnapshot(null);
    setPendingFiles([]);
  }

  function clearForm() {
    setMode("single");
    resetFieldErrors();
    const today = new Date().toISOString().slice(0, 10);
    setServiceDate(today);
    setMileage(defaultMileage);
    setCategory(null);
    setEntries([{ title: "", cost: "" }]);
    setDescription("");
    setWorkshopId(null);
    setWorkshopSnapshot(null);
    setPendingFiles([]);
  }

  function pickAttachment() {
    Alert.alert(
      t("attachments.addPickerTitle"),
      t("attachments.addPickerBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("attachments.camera"), onPress: () => void pickFromCamera() },
        {
          text: t("attachments.photos"),
          onPress: () => void pickFromGallery(),
        },
        { text: t("attachments.files"), onPress: () => void pickFromFiles() },
      ],
    );
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
        setUploading(true);
        await checkAndUpload({
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
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.galleryPermissionDenied"));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));

      if (entryId) {
        setUploading(true);
        await checkAndUpload({
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
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
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
        setUploading(true);
        await checkAndUpload({
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
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
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
          : null;
      const basePayload = buildServiceEntryBasePayload(
        vehicleId,
        formValues,
        workshopName,
      );

      if (entryId) {
        const first = entries[0];
        const firstRow = buildServiceEntryRowPayload(
          first,
          description,
        );
        await updateServiceEntry(entryId, {
          ...basePayload,
          ...firstRow,
        });
        for (let i = 1; i < entries.length; i++) {
          const row = entries[i];
          await createServiceEntry({
            ...basePayload,
            ...buildServiceEntryRowPayload(row, ""),
          });
        }
      } else {
        const first = entries[0];
        const created = await createServiceEntry({
          ...basePayload,
          ...buildServiceEntryRowPayload(
            first,
            isMulti ? "" : description,
          ),
        });
        if (!isMulti && pendingFiles.length) {
          setUploading(true);
          for (const f of pendingFiles) {
            await checkAndUpload({
              serviceEntryId: created.id,
              vehicleId,
              fileUri: f.uri,
              mimeType: f.mimeType,
              fileName: f.fileName,
            });
          }
        }
        for (let i = 1; i < entries.length; i++) {
          const row = entries[i];
          await createServiceEntry({
            ...basePayload,
            ...buildServiceEntryRowPayload(row, ""),
          });
        }
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <ModalLayout
      title={entryId ? t("entryForm.editTitle") : t("entryForm.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{
        onPress: onSave,
        label: t("common.done"),
        disabled: saving || uploading,
        loading: saving || uploading,
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
                <>
                  <Text
                    style={[
                      styles.presetsSectionLabel,
                      { color: theme.colors.muted },
                    ]}
                  >
                    {t("entryForm.presetsTitle")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScrollContent}
                    style={styles.presetsScroll}
                  >
                    {SERVICE_ENTRY_PRESETS.map((preset) => (
                      <Pressable
                        key={preset.titleKey}
                        onPress={() => applyPreset(preset)}
                        style={({ pressed }) => [
                          styles.presetChip,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipTitle,
                            { color: theme.colors.fg },
                          ]}
                          numberOfLines={2}
                        >
                          {t(`reminderForm.${preset.titleKey}`)}
                        </Text>
                        <View style={styles.presetChipSummaryWrap}>
                          <Text
                            style={[
                              styles.presetChipSummary,
                              { color: theme.colors.muted },
                            ]}
                            numberOfLines={1}
                          >
                            {t(
                              `entryForm.categories.${preset.category}` as any,
                            )}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={{ height: theme.spacing.sm }} />
                </>
              ) : null}
            </>
          ) : null}

          <Card style={styles.card}>
            <FormDateRow
              icon="calendar-outline"
              label={t("entryForm.serviceDate")}
              value={serviceDate}
              onChange={setServiceDate}
              disabled={saving || uploading}
              error={fieldError(fieldErrors.serviceDate)}
            />

            <Pressable
              onPress={() =>
                showPicker<ServiceEntryCategory>({
                  title: t("entryForm.category"),
                  value: category,
                  options: SERVICE_ENTRY_CATEGORY_OPTIONS,
                  getLabel: (v) => t(`entryForm.categories.${v}` as any),
                  onChange: setCategory,
                  placeholderLabel: t("entryForm.categoryPlaceholder"),
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow error={fieldError(fieldErrors.category)}>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("entryForm.category")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: category ? theme.colors.fg : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {category
                    ? t(`entryForm.categories.${category}` as any)
                    : t("entryForm.categoryPlaceholder")}
                </Text>
              </CardRow>
            </Pressable>

            <Pressable
              onPress={() =>
                showPicker<string>({
                  title: t("entryForm.workshop"),
                  value: workshopId,
                  options: workshops.map((w) => w.id),
                  getLabel: (id) =>
                    workshops.find((w) => w.id === id)?.name ?? "",
                  onChange: (selectedId) => {
                    setWorkshopId(selectedId);
                    setWorkshopSnapshot(
                      selectedId
                        ? (workshops.find((w) => w.id === selectedId)?.name ??
                            workshopSnapshot)
                        : null,
                    );
                  },
                  placeholderLabel: t("entryForm.workshopPlaceholder"),
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("entryForm.workshop")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.valueText,
                    {
                      color: workshopId ? theme.colors.fg : theme.colors.muted,
                      textAlign: "right",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {workshopId
                    ? (workshops.find((w) => w.id === workshopId)?.name ??
                      workshopSnapshot ??
                      t("entryForm.workshopPlaceholder"))
                    : t("entryForm.workshopPlaceholder")}
                </Text>
              </CardRow>
            </Pressable>

            <FormInputRow
              icon="speedometer-outline"
              label={`${t("entryForm.mileage")} (${distanceUnitLabel})`}
              value={mileage}
              onChangeText={setMileage}
              decimal
              keyboardType="decimal-pad"
              editable={!saving && !uploading}
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
                    <FormInputRow
                      icon="document-text-outline"
                      label={t("entryForm.entryTitle")}
                      value={row.title}
                      onChangeText={(text) =>
                        updateEntry(index, { title: text })
                      }
                      editable={!saving && !uploading}
                      placeholder={t("entryForm.placeholderTitle")}
                      error={fieldError(fieldErrors.entryTitles[index] ?? false)}
                    />
                    <FormInputRow
                      icon="cash-outline"
                      label={t("entryForm.cost")}
                      value={row.cost}
                      onChangeText={(text) =>
                        updateEntry(index, { cost: text })
                      }
                      decimal
                      keyboardType="decimal-pad"
                      editable={!saving && !uploading}
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
                  disabled={saving || uploading}
                >
                  {t("entryForm.addAnotherEntry")}
                </Button>
                <Text
                  style={[styles.noticeText, { color: theme.colors.muted }]}
                >
                  {t("entryForm.multiModeInfo")}
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
                  editable={!saving && !uploading}
                  placeholder={t("entryForm.placeholderTitle")}
                  error={fieldError(fieldErrors.entryTitles[0] ?? false)}
                />
                <FormInputRow
                  icon="cash-outline"
                  label={t("entryForm.cost")}
                  value={entries[0]?.cost ?? ""}
                  onChangeText={(text) => updateEntry(0, { cost: text })}
                  decimal
                  keyboardType="decimal-pad"
                  editable={!saving && !uploading}
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
                    editable={!saving && !uploading}
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
                  onPress={pickAttachment}
                  variant="ghost"
                  disabled={saving || uploading}
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
                    ) : !uploading && attachments.length === 0 ? (
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
    presetsSectionLabel: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    presetsScroll: {
      maxHeight: 90,
    },
    presetsScrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      gap: theme.spacing.sm,
    },
    presetChip: {
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    presetChipTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    presetChipSummaryWrap: {
      marginTop: theme.spacing.sm,
    },
    presetChipSummary: {
      fontSize: theme.typography.small,
    },
    card: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
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
