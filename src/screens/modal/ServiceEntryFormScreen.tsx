import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { isValidDate, isNonNegativeNumber } from "../../utils/validation";
import type { Attachment, ServiceEntryCategory } from "../../types/domain";
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
import {
  getAttachmentOpenUrl,
  getFileNameFromItem,
} from "../../services/storage/openFileUrl";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import type { Workshop } from "../../types/domain";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { Card, CardDivider, CardRow } from "../../ui/components/common/Card";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { Ionicons } from "@expo/vector-icons";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { Textarea } from "../../ui/components/common/Textarea";
import { InlineDatePicker } from "../../ui/components/common/InlineDatePicker";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { SquarePen, Trash2 } from "lucide-react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { formatYmd, parseYmd } from "../../utils/dateYmd";

const CATEGORY_OPTIONS: ServiceEntryCategory[] = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_change",
  "other",
];

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useUserSettings();
  const { isPremium, workshopsLimit, freePlanWorkshopIds } = useEntitlements();
  const { vehicleId, entryId } = route.params as any;
  const distanceUnit = settings?.distanceUnit ?? "km";
  const distanceUnitLabel = distanceUnit === "miles" ? "mi" : "km";
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  type EntryRow = { title: string; cost: string };
  type FormMode = "single" | "multi";
  const [mode, setMode] = useState<FormMode>("single");
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(
    () => new Date(),
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

  function openAttachment(att: Attachment) {
    try {
      const url = getAttachmentOpenUrl(att);
      void Linking.openURL(url);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
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

  function renderAttachmentRightActions(item: Attachment) {
    return (
      <View style={styles.swipeActionsWrap}>
        <Pressable
          onPress={() => handleEditAttachmentName(item)}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.accent }]}
        >
          <SquarePen size={20} color="#000000" />
        </Pressable>
        <Pressable
          onPress={() => confirmDeleteAttachment(item)}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.danger }]}
        >
          <Trash2 size={20} color="#000000" />
        </Pressable>
      </View>
    );
  }

  function renderPendingAttachmentRightActions(
    index: number,
    item: { uri: string; mimeType?: string | null; fileName?: string | null },
  ) {
    return (
      <View style={styles.swipeActionsWrap}>
        <Pressable
          onPress={() => handleEditPendingFileName(index, item.fileName)}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.accent }]}
        >
          <SquarePen size={20} color="#000000" />
        </Pressable>
        <Pressable
          onPress={() => {
            setPendingFiles((prev) => prev.filter((_, i) => i !== index));
          }}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.danger }]}
        >
          <Trash2 size={20} color="#000000" />
        </Pressable>
      </View>
    );
  }

  const canSave = useMemo(() => {
    return (
      isValidDate(serviceDate) &&
      category != null &&
      entries.every((e) => e.title.trim().length > 0) &&
      entries.every((e) => isNonNegativeNumber(e.cost)) &&
      isNonNegativeNumber(mileage)
    );
  }, [serviceDate, category, entries, mileage]);

  function openDatePicker() {
    setDatePickerDraft(parseYmd(serviceDate));
    setDatePickerOpen(true);
  }

  function showPicker<T extends string>(opts: {
    title: string;
    value: T | null;
    options: readonly T[];
    getLabel: (v: T) => string;
    onChange: (v: T | null) => void;
    placeholderLabel?: string;
  }) {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }> = [{ text: t("common.cancel"), style: "cancel" }];

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

  function clearForm() {
    setMode("single");
    const today = new Date().toISOString().slice(0, 10);
    setServiceDate(today);
    setDatePickerDraft(parseYmd(today));
    setMileage("");
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
    try {
      setSaving(true);
      if (!category) throw new Error(t("entryForm.categoryRequired"));
      if (!isValidDate(serviceDate)) {
        toastError(t("validation.invalidDate"));
        return;
      }
      if (!isNonNegativeNumber(mileage)) {
        toastError(t("validation.nonNegativeRequired"));
        return;
      }
      for (const e of entries) {
        if (!isNonNegativeNumber(e.cost)) {
          toastError(t("validation.nonNegativeRequired"));
          return;
        }
      }
      const basePayload = {
        vehicle_id: vehicleId,
        service_date: serviceDate.trim(),
        mileage: mileage.trim().length ? Number(mileage) : null,
        category,
        workshop_id: workshopId || null,
        workshop_snapshot:
          workshopId != null
            ? (workshops.find((w) => w.id === workshopId)?.name ??
              workshopSnapshot)
            : null,
      };

      if (entryId) {
        const first = entries[0];
        await updateServiceEntry(entryId, {
          ...basePayload,
          title: first.title.trim(),
          description: description.trim(),
          cost: first.cost.trim().length ? Number(first.cost) : null,
        });
        for (let i = 1; i < entries.length; i++) {
          const row = entries[i];
          await createServiceEntry({
            ...basePayload,
            title: row.title.trim(),
            description: "",
            cost: row.cost.trim().length ? Number(row.cost) : null,
          });
        }
      } else {
        const first = entries[0];
        const created = await createServiceEntry({
          ...basePayload,
          title: first.title.trim(),
          description: isMulti ? "" : description.trim(),
          cost: first.cost.trim().length ? Number(first.cost) : null,
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
            title: row.title.trim(),
            description: "",
            cost: row.cost.trim().length ? Number(row.cost) : null,
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
        disabled: !canSave || saving || uploading,
      }}
      footer={
        entryId ? (
          <Button variant="destructive" onPress={confirmDeleteEntry}>
            {t("common.delete")}
          </Button>
        ) : (
          <Button variant="outlined" onPress={clearForm} disabled={saving}>
            {t("common.clearButton")}
          </Button>
        )
      }
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView>
          {!entryId ? (
            <>
              <SegmentTabs<"single" | "multi">
                variant="secondary"
                value={mode}
                options={[
                  { value: "single", label: t("entryForm.modeSingle") },
                  { value: "multi", label: t("entryForm.modeMulti") },
                ]}
                onChange={setFormMode}
              />
              <View style={{ height: theme.spacing.sm }} />
            </>
          ) : null}

          <Card>
            <Pressable
              onPress={openDatePicker}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("entryForm.serviceDate")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.valueText,
                    { color: theme.colors.fg, textAlign: "right" },
                  ]}
                  numberOfLines={1}
                >
                  {serviceDate}
                </Text>
              </CardRow>
            </Pressable>

            {datePickerOpen ? (
              <InlineDatePicker
                value={datePickerDraft}
                onChangeDraft={setDatePickerDraft}
                onCancel={() => setDatePickerOpen(false)}
                onConfirm={(picked) => {
                  setServiceDate(formatYmd(picked));
                  setDatePickerOpen(false);
                }}
              />
            ) : null}

            <Pressable
              onPress={() =>
                showPicker<ServiceEntryCategory>({
                  title: t("entryForm.category"),
                  value: category,
                  options: CATEGORY_OPTIONS,
                  getLabel: (v) => t(`entryForm.categories.${v}` as any),
                  onChange: setCategory,
                  placeholderLabel: t("entryForm.categoryPlaceholder"),
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
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

            <CardRow>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[styles.label, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {t("entryForm.mileage")} ({distanceUnitLabel})
                </Text>
              </View>
              <TextInput
                value={mileage}
                onChangeText={setMileage}
                keyboardType="number-pad"
                editable={!saving && !uploading}
                placeholder={t("entryForm.placeholderMileage")}
                placeholderTextColor={theme.colors.muted}
                style={[
                  styles.input,
                  { color: theme.colors.fg, textAlign: "right" },
                ]}
              />
            </CardRow>
          </Card>

          <View style={{ height: theme.spacing.sm }} />

          {isMulti ? (
            <>
              {entries.map((row, index) => (
                <View key={index}>
                  <Card>
                    <CardRow>
                      <View style={styles.rowLeft}>
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color={theme.colors.accent}
                        />
                        <Text
                          style={[styles.label, { color: theme.colors.muted }]}
                          numberOfLines={1}
                        >
                          {t("entryForm.entryTitle")}
                        </Text>
                      </View>
                      <TextInput
                        value={row.title}
                        onChangeText={(text) =>
                          updateEntry(index, { title: text })
                        }
                        editable={!saving && !uploading}
                        placeholder={t("entryForm.placeholderTitle")}
                        placeholderTextColor={theme.colors.muted}
                        style={[
                          styles.input,
                          { color: theme.colors.fg, textAlign: "right" },
                        ]}
                      />
                    </CardRow>
                    <CardRow>
                      <View style={styles.rowLeft}>
                        <Ionicons
                          name="cash-outline"
                          size={20}
                          color={theme.colors.accent}
                        />
                        <Text
                          style={[styles.label, { color: theme.colors.muted }]}
                          numberOfLines={1}
                        >
                          {t("entryForm.cost")}
                        </Text>
                      </View>
                      <TextInput
                        value={row.cost}
                        onChangeText={(text) =>
                          updateEntry(index, { cost: text })
                        }
                        keyboardType="decimal-pad"
                        editable={!saving && !uploading}
                        placeholder={t("entryForm.placeholderCost")}
                        placeholderTextColor={theme.colors.muted}
                        style={[
                          styles.input,
                          { color: theme.colors.fg, textAlign: "right" },
                        ]}
                      />
                      {isMultipleRows && (!entryId || index > 0) ? (
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
                      ) : null}
                    </CardRow>
                  </Card>
                  {index < entries.length - 1 ? (
                    <View style={{ height: theme.spacing.sm }} />
                  ) : null}
                </View>
              ))}

              <View style={{ height: theme.spacing.sm }} />
              <Button
                onPress={addEntry}
                variant="ghost"
                disabled={saving || uploading}
              >
                {t("entryForm.addAnotherEntry")}
              </Button>
              <Text style={[styles.noticeText, { color: theme.colors.muted }]}>
                {t("entryForm.multiModeInfo")}
              </Text>
            </>
          ) : (
            <>
              <Card>
                <CardRow>
                  <View style={styles.rowLeft}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <Text
                      style={[styles.label, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {t("entryForm.entryTitle")}
                    </Text>
                  </View>
                  <TextInput
                    value={entries[0]?.title ?? ""}
                    onChangeText={(text) => updateEntry(0, { title: text })}
                    editable={!saving && !uploading}
                    placeholder={t("entryForm.placeholderTitle")}
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      styles.input,
                      { color: theme.colors.fg, textAlign: "right" },
                    ]}
                  />
                </CardRow>
                <CardRow>
                  <View style={styles.rowLeft}>
                    <Ionicons
                      name="cash-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <Text
                      style={[styles.label, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {t("entryForm.cost")}
                    </Text>
                  </View>
                  <TextInput
                    value={entries[0]?.cost ?? ""}
                    onChangeText={(text) => updateEntry(0, { cost: text })}
                    keyboardType="decimal-pad"
                    editable={!saving && !uploading}
                    placeholder={t("entryForm.placeholderCost")}
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      styles.input,
                      { color: theme.colors.fg, textAlign: "right" },
                    ]}
                  />
                </CardRow>
              </Card>

              <View style={{ height: theme.spacing.sm }} />
              <Card>
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
              <View style={styles.sectionHeader}>
                <Text style={styles.h2}>
                  {t("attachments.titleWithCount", {
                    count: entryId ? attachments.length : pendingFiles.length,
                  })}
                </Text>
              </View>
              <View style={{ height: theme.spacing.sm }} />
              <Button
                onPress={pickAttachment}
                variant="ghost"
                disabled={saving || uploading}
              >
                {t("entryForm.addAttachment")}
              </Button>
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
                    <Swipeable
                      renderRightActions={() => renderAttachmentRightActions(item)}
                      rightThreshold={32}
                    >
                      <ListRowWithActions
                        title={
                          item.display_name?.trim() ||
                          t("attachments.attachmentLabel")
                        }
                        subtitle={(() => {
                          const fileName = getFileNameFromItem(item);
                          const ext =
                            fileName.split(".").pop()?.toUpperCase() || "FILE";
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
                    </Swipeable>
                  )}
                  ListEmptyComponent={
                    attachmentsLoading ? (
                      <View style={styles.loadingContainer}>
                        <LoadingIndicator />
                      </View>
                    ) : !uploading && attachments.length === 0 ? (
                      <Text style={styles.muted}>
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
                    <Swipeable
                      renderRightActions={() =>
                        renderPendingAttachmentRightActions(index, item)
                      }
                      rightThreshold={32}
                    >
                      <ListRowWithActions
                        title={
                          item.fileName?.trim() ||
                          t("attachments.attachmentLabel")
                        }
                      />
                    </Swipeable>
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
    swipeActionsWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginLeft: theme.spacing.xs,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    swipeActionBtn: {
      width: 72,
      alignItems: "center",
      justifyContent: "center",
    },
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
      borderRadius: theme.radius.md,
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
