import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { isValidDate, isNonNegativeNumber } from "../utils/validation";
import type { Attachment, ServiceEntryCategory } from "../types/domain";
import {
  createServiceEntry,
  getServiceEntry,
  updateServiceEntry,
} from "../services/serviceEntries/serviceEntriesRepo";
import {
  deleteAttachment,
  listAttachments,
  listVehicleAttachments,
  uploadAttachment,
} from "../services/attachments/attachmentsRepo";
import { getAttachmentOpenUrl, getFileNameFromItem } from "../services/storage/openFileUrl";
import { listVehicleDocuments } from "../services/vehicleDocuments/vehicleDocumentsRepo";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import type { Workshop } from "../types/domain";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { DateField } from "../ui/components/DateField";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { IconButton } from "../ui/components/IconButton";
import { ChoiceChip } from "../ui/components/ChoiceChip";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useUserSettings();
  const { vehicleId, entryId } = route.params as any;
  const distanceUnit = settings?.distanceUnit ?? "km";

  type EntryRow = { title: string; cost: string };
  type FormMode = "single" | "multi";
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

  const MAX_DOCUMENTS_AND_ATTACHMENTS = 10;

  const checkAndUpload = useCallback(
    async (params: {
      serviceEntryId: string;
      vehicleId: string;
      fileUri: string;
      mimeType?: string | null;
      fileName?: string | null;
    }) => {
      const [docs, atts] = await Promise.all([
        listVehicleDocuments(vehicleId),
        listVehicleAttachments(vehicleId),
      ]);
      if (docs.length + atts.length >= MAX_DOCUMENTS_AND_ATTACHMENTS) {
        toastError(t("documents.limitReached"));
        return;
      }
      await uploadAttachment(params);
    },
    [vehicleId, t],
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
    void listWorkshops().then(setWorkshops);
  }, []);

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

  const canSave = useMemo(() => {
    return (
      isValidDate(serviceDate) &&
      category != null &&
      entries.every((e) => e.title.trim().length > 0) &&
      entries.every((e) => isNonNegativeNumber(e.cost)) &&
      isNonNegativeNumber(mileage)
    );
  }, [serviceDate, category, entries, mileage]);

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
    <FormScreen
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              onPress={() => {
                if (canSave && !saving) {
                  void onSave();
                }
              }}
              hitSlop={10}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !canSave || saving ? 0.5 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name="save-outline"
                size={24}
                color={theme.colors.accent}
              />
            </Pressable>
          }
        />
      }
    >
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>
        {entryId ? t("entryForm.editTitle") : t("entryForm.title")}
      </Text>

      {!entryId && (
        <>
          <View style={styles.modeRow}>
            {(["single", "multi"] as const).map((m) => (
              <ChoiceChip
                key={m}
                label={
                  m === "single"
                    ? t("entryForm.modeSingle")
                    : t("entryForm.modeMulti")
                }
                selected={mode === m}
                onPress={() => setFormMode(m)}
                style={styles.modeChoice}
              />
            ))}
          </View>
        </>
      )}

      <View style={{ height: theme.spacing.sm }} />

      <DateField
        noMarginTop
        label={`${t("entryForm.serviceDate")} *`}
        value={serviceDate}
        onChange={setServiceDate}
        disabled={saving || uploading}
      />

      <PickerField
        label={`${t("entryForm.category")} *`}
        value={category}
        options={
          [
            "maintenance",
            "repair",
            "inspection",
            "upgrade",
            "oil_engine",
            "other",
          ] as const
        }
        getLabel={(value) => t(`entryForm.categories.${value}` as any)}
        onChange={(value) => setCategory(value)}
        placeholder={t("entryForm.category")}
        disabled={saving || uploading}
      />

      <TextField
        label={`${t("entryForm.mileage")} (${distanceUnit})`}
        value={mileage}
        onChangeText={setMileage}
        keyboardType="number-pad"
        placeholder={t("entryForm.placeholderMileage")}
      />

      <PickerField
        label={t("entryForm.workshop")}
        value={workshopId}
        options={
          workshopId && !workshops.some((w) => w.id === workshopId)
            ? [workshopId, ...workshops.map((w) => w.id)]
            : workshops.map((w) => w.id)
        }
        getLabel={(id) => workshops.find((w) => w.id === id)?.name ?? id}
        onChange={(id) => setWorkshopId(id)}
        placeholder={t("entryForm.workshopPlaceholder")}
        disabled={saving || uploading}
      />

      {entries.map((row, index) => (
        <View key={index} style={styles.entryRow}>
          <View style={styles.entryRowFields}>
            <View style={styles.entryTitleWrap}>
              <TextField
                noMarginTop={index > 0}
                label={
                  index === 0 ? `${t("entryForm.entryTitle")} *` : undefined
                }
                value={row.title}
                onChangeText={(text) => updateEntry(index, { title: text })}
                placeholder={t("entryForm.placeholderTitle")}
              />
            </View>
            <View style={styles.entryCostWrap}>
              <TextField
                noMarginTop={index > 0}
                label={index === 0 ? t("entryForm.cost") : undefined}
                value={row.cost}
                onChangeText={(text) => updateEntry(index, { cost: text })}
                keyboardType="decimal-pad"
                placeholder={t("entryForm.placeholderCost")}
              />
            </View>
          </View>
          {isMulti && isMultipleRows && (!entryId || index > 0) && (
            <View style={styles.entryRemoveWrap}>
              <Pressable
                onPress={() => removeEntry(index)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.entryRemoveBtn,
                  {
                    borderColor: theme.colors.danger,
                    backgroundColor: theme.colors.card,
                  },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.danger}
                />
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {isMulti && (
        <>
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
      )}

      {!isMulti && (
        <>
          <TextField
            label={t("entryForm.description")}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={t("entryForm.placeholderDescription")}
          />

          <View style={{ height: theme.spacing.sm }} />
          <View style={styles.sectionHeader}>
            <Text style={styles.h2}>{t("attachments.title")}</Text>
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
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => void openAttachment(item)}
                    >
                      <Text style={styles.cardTitle}>
                        {t("attachments.attachmentLabel")}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {(() => {
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
                          return `${t(
                            "documents.added",
                          )} ${formattedDate} · ${ext}`;
                        })()}
                      </Text>
                    </Pressable>
                    <IconButton
                      onPress={() => confirmDeleteAttachment(item)}
                      variant="danger"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={24}
                        color={theme.colors.danger}
                      />
                    </IconButton>
                  </View>
                </View>
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
              data={pendingFiles}
              keyExtractor={(_, index) => `pending-${index}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: theme.spacing.sm }} />
              )}
              renderItem={({ item, index }) => (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {item.fileName || t("attachments.attachmentLabel")}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {t("entryForm.pendingAttachments", { count: 1 })}
                      </Text>
                    </View>
                    <IconButton
                      onPress={() => {
                        setPendingFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                      variant="danger"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={24}
                        color={theme.colors.danger}
                      />
                    </IconButton>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                pendingFiles.length === 0 ? (
                  <Text style={styles.muted}>
                    {t("entryForm.attachmentsEmpty")}
                  </Text>
                ) : null
              }
            />
          )}
        </>
      )}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
      color: theme.colors.fg,
    },
    modeLabel: {
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    modeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    modeChoice: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    h2: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    sectionHeader: { gap: theme.spacing.sm / 2 },
    muted: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    pending: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.muted,
    },
    notice: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    noticeText: {
      marginTop: theme.spacing.sm / 2,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
      color: theme.colors.muted,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: { fontWeight: "800", color: theme.colors.fg },
    cardMeta: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm / 2,
      marginBottom: theme.spacing.xs,
    },
    entryRowFields: {
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm / 2,
      minWidth: 0,
    },
    entryTitleWrap: { flex: 2, minWidth: 0 },
    entryCostWrap: { flex: 1, minWidth: 0 },
    entryRemoveWrap: {
      alignSelf: "flex-end",
      marginBottom: theme.spacing.xs / 2,
    },
    entryRemoveBtn: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
