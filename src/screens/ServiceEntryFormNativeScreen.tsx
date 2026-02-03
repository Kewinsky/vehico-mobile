/**
 * Fully native iOS service entry form using @expo/ui SwiftUI.
 * Designed for iOS with grouped sections, emoji labels, and optional iOS 26 liquid/glass.
 * Use development build (not Expo Go) to run.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  getAttachmentOpenUrl,
  getFileNameFromItem,
} from "../services/storage/openFileUrl";
import { listVehicleDocuments } from "../services/vehicleDocuments/vehicleDocumentsRepo";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import type { Workshop } from "../types/domain";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";

import {
  Button,
  DateTimePicker,
  Form,
  Host,
  LabeledContent,
  Picker,
  Section,
  TextField,
  VStack,
} from "@expo/ui/swift-ui";

const CATEGORY_KEYS: ServiceEntryCategory[] = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_engine",
  "other",
];

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

type EntryRow = { title: string; cost: string };
type FormMode = "single" | "multi";

export function ServiceEntryFormNativeScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { settings } = useUserSettings();
  const { vehicleId, entryId } = route.params as {
    vehicleId: string;
    entryId?: string;
  };
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [mode, setMode] = useState<FormMode>("single");
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
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
    [vehicleId, t]
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
          { title: e.title, cost: e.cost != null ? String(e.cost) : "" },
        ]);
        setDescription(e.description ?? "");
        setWorkshopId((e as { workshop_id?: string }).workshop_id ?? null);
        setMode("single");
        await reloadAttachments(entryId);
      } catch (err: unknown) {
        toastError((err as Error)?.message ?? t("common.error"));
      }
    })();
  }, [entryId, reloadAttachments, t]);

  const isMulti = mode === "multi";
  const isMultipleRows = entries.length > 1;

  function updateEntry(index: number, patch: Partial<EntryRow>) {
    setEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
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
    } catch (e: unknown) {
      toastError((e as Error)?.message ?? t("common.error"));
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
            } catch (e: unknown) {
              toastError((e as Error)?.message ?? t("common.error"));
            }
          },
        },
      ]
    );
  }

  const canSave = useMemo(
    () =>
      isValidDate(serviceDate) &&
      category != null &&
      entries.every((e) => e.title.trim().length > 0) &&
      entries.every((e) => isNonNegativeNumber(e.cost)) &&
      isNonNegativeNumber(mileage),
    [serviceDate, category, entries, mileage]
  );

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
      ]
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
    } catch (e: unknown) {
      Alert.alert(t("common.error"), (e as Error)?.message ?? String(e));
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
    } catch (e: unknown) {
      Alert.alert(t("common.error"), (e as Error)?.message ?? String(e));
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
    } catch (e: unknown) {
      Alert.alert(t("common.error"), (e as Error)?.message ?? String(e));
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
    } catch (e: unknown) {
      Alert.alert(t("common.error"), (e as Error)?.message ?? String(e));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  const modeLabels = [t("entryForm.modeSingle"), t("entryForm.modeMulti")];
  const categoryLabels = CATEGORY_KEYS.map((k) =>
    t(`entryForm.categories.${k}` as const)
  );
  const categoryIndex =
    category != null ? CATEGORY_KEYS.indexOf(category) : null;
  const workshopOptions = [
    ...(workshopId && !workshops.some((w) => w.id === workshopId)
      ? [workshopId]
      : []),
    ...workshops.map((w) => w.id),
  ];
  const workshopLabels = workshopOptions.map(
    (id) => workshops.find((w) => w.id === id)?.name ?? id
  );
  const workshopIndex =
    workshopId != null ? workshopOptions.indexOf(workshopId) : -1;
  const workshopSelectedIndex = workshopIndex >= 0 ? workshopIndex : null;

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {t("common.error")} – Native form is only available on iOS.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* iOS-style header: Anuluj | title | Gotowe */}
      <View style={styles.header}>
        <View style={styles.headerPillWrap}>
          <Host matchContents>
            <Button
              variant="bordered"
              role="cancel"
              onPress={() => navigation.goBack()}
            >
              {t("common.cancel")}
            </Button>
          </Host>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {entryId ? t("entryForm.editTitle") : t("entryForm.title")}
        </Text>
        <View style={styles.headerPillWrap}>
          <Host matchContents>
            <Button
              variant="glassProminent"
              disabled={!canSave || saving}
              onPress={() => canSave && !saving && void onSave()}
            >
              {t("common.done")}
            </Button>
          </Host>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tryb: Jeden / Wiele — segmented */}
        {!entryId && (
          <View style={styles.hostRow}>
            <Host style={styles.hostSegmented} matchContents>
              <VStack spacing={8}>
                <Picker
                  options={modeLabels}
                  selectedIndex={mode === "single" ? 0 : 1}
                  onOptionSelected={({ nativeEvent: { index } }) =>
                    setFormMode(index === 0 ? "single" : "multi")
                  }
                  variant="segmented"
                />
              </VStack>
            </Host>
          </View>
        )}

        {/* Native Form: Data, Informacje, Kategoria, Warsztat */}
        <Host style={styles.formHost} useViewportSizeMeasurement>
          <Form scrollEnabled>
            <Section title={t("entryForm.serviceDate") + " *"}>
              <DateTimePicker
                initialDate={parseYmd(serviceDate).toISOString()}
                onDateSelected={(date) => setServiceDate(formatYmd(date))}
                displayedComponents="date"
                variant="wheel"
              />
            </Section>

            <Section title={"📋 " + t("entryForm.category") + " *"}>
              <Picker
                label={t("entryForm.category")}
                options={categoryLabels}
                selectedIndex={categoryIndex}
                onOptionSelected={({ nativeEvent: { index } }) =>
                  setCategory(CATEGORY_KEYS[index] ?? null)
                }
                variant="menu"
              />
            </Section>

            <Section
              title={"🛣️ " + t("entryForm.mileage") + ` (${distanceUnit})`}
            >
              <LabeledContent label={t("entryForm.mileage")}>
                <TextField
                  key={`mileage-${mileage}`}
                  defaultValue={mileage}
                  onChangeText={setMileage}
                  keyboardType="numeric"
                  placeholder={t("entryForm.placeholderMileage")}
                />
              </LabeledContent>
            </Section>

            <Section title={"🔧 " + t("entryForm.workshop")}>
              <Picker
                label={t("entryForm.workshop")}
                options={[
                  t("entryForm.workshopPlaceholder"),
                  ...workshopLabels,
                ]}
                selectedIndex={
                  workshopSelectedIndex != null ? workshopSelectedIndex + 1 : 0
                }
                onOptionSelected={({ nativeEvent: { index } }) => {
                  if (index === 0) setWorkshopId(null);
                  else setWorkshopId(workshopOptions[index - 1] ?? null);
                }}
                variant="menu"
              />
            </Section>
          </Form>
        </Host>

        {/* Wpisy (tytuł + koszt) — RN for controlled inputs */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>
            📝 {t("entryForm.entryTitle")} / {t("entryForm.cost")}
          </Text>
          {entries.map((row, index) => (
            <View key={index} style={styles.entryRow}>
              <View style={styles.entryFields}>
                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>
                    {index === 0
                      ? `${t("entryForm.entryTitle")} *`
                      : `#${index + 1}`}
                  </Text>
                  <TextInputLike
                    value={row.title}
                    onChangeText={(text) => updateEntry(index, { title: text })}
                    placeholder={t("entryForm.placeholderTitle")}
                    theme={theme}
                  />
                </View>
                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>
                    {index === 0 ? t("entryForm.cost") : ""}
                  </Text>
                  <TextInputLike
                    value={row.cost}
                    onChangeText={(text) => updateEntry(index, { cost: text })}
                    placeholder={t("entryForm.placeholderCost")}
                    theme={theme}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              {isMulti && isMultipleRows && (!entryId || index > 0) && (
                <IconButton onPress={() => removeEntry(index)} variant="danger">
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={theme.colors.danger}
                  />
                </IconButton>
              )}
            </View>
          ))}
          {isMulti && (
            <Pressable
              onPress={addEntry}
              style={({ pressed }) => [
                styles.addEntryBtn,
                { borderColor: theme.colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[styles.addEntryText, { color: theme.colors.accent }]}
              >
                + {t("entryForm.addAnotherEntry")}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Opis + Załączniki — native */}
        {!isMulti && (
          <>
            <Host style={styles.formHostSection} useViewportSizeMeasurement>
              <Form scrollEnabled={false}>
                <Section title={"📄 " + t("entryForm.description")}>
                  <TextField
                    key={`desc-${description.slice(0, 20)}`}
                    defaultValue={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder={t("entryForm.placeholderDescription")}
                  />
                </Section>
              </Form>
            </Host>

            <View style={styles.addAttachmentWrap}>
              <Host matchContents>
                <Button
                  variant="plain"
                  onPress={pickAttachment}
                  disabled={saving || uploading}
                >
                  📎 {t("entryForm.addAttachment")}
                </Button>
              </Host>
            </View>

            {entryId ? (
              <FlatList
                data={attachments}
                keyExtractor={(a) => a.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  attachmentsLoading ? (
                    <LoadingIndicator />
                  ) : !uploading && attachments.length === 0 ? (
                    <Text style={styles.muted}>
                      {t("entryForm.attachmentsEmpty")}
                    </Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <View style={styles.attachmentCard}>
                    <Pressable
                      style={styles.attachmentPress}
                      onPress={() => void openAttachment(item)}
                    >
                      <Text style={styles.attachmentTitle}>
                        {t("attachments.attachmentLabel")}
                      </Text>
                      <Text style={styles.attachmentMeta}>
                        {getFileNameFromItem(item)} ·{" "}
                        {new Date(item.created_at).toLocaleDateString(
                          i18n.language === "pl" ? "pl-PL" : "en-US"
                        )}
                      </Text>
                    </Pressable>
                    <IconButton
                      onPress={() => confirmDeleteAttachment(item)}
                      variant="danger"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={theme.colors.danger}
                      />
                    </IconButton>
                  </View>
                )}
              />
            ) : (
              <FlatList
                data={pendingFiles}
                keyExtractor={(_, i) => `p-${i}`}
                scrollEnabled={false}
                ListEmptyComponent={
                  pendingFiles.length === 0 ? (
                    <Text style={styles.muted}>
                      {t("entryForm.attachmentsEmpty")}
                    </Text>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <View style={styles.attachmentCard}>
                    <View style={styles.attachmentPress}>
                      <Text style={styles.attachmentTitle}>
                        {item.fileName ?? t("attachments.attachmentLabel")}
                      </Text>
                      <Text style={styles.attachmentMeta}>
                        {t("entryForm.pendingAttachments", { count: 1 })}
                      </Text>
                    </View>
                    <IconButton
                      onPress={() =>
                        setPendingFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      variant="danger"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={theme.colors.danger}
                      />
                    </IconButton>
                  </View>
                )}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Simple RN text input styled like iOS grouped row (for controlled entry rows). */
function TextInputLike({
  value,
  onChangeText,
  placeholder,
  theme,
  keyboardType = "default",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  theme: { colors: { fg: string; muted: string }; spacing: number };
  keyboardType?: "default" | "decimal-pad" | "number-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      keyboardType={keyboardType}
      style={{
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        fontSize: 17,
        color: theme.colors.fg,
      }}
    />
  );
}

const makeStyles = (
  theme: { colors: Record<string, string>; spacing: Record<string, number> },
  insets: { top: number; bottom: number }
) =>
  StyleSheet.create({
    fallback: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: theme.colors.bg,
    },
    fallbackText: {
      color: theme.colors.muted,
      textAlign: "center",
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      paddingTop: insets.top,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    headerPillWrap: {
      minWidth: 80,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
    hostRow: {
      marginVertical: theme.spacing.sm,
      minHeight: 40,
    },
    hostSegmented: {
      minHeight: 36,
      alignSelf: "stretch",
    },
    formHost: {
      minHeight: 320,
      marginBottom: theme.spacing.md,
    },
    formHostSection: {
      minHeight: 120,
      marginBottom: theme.spacing.sm,
    },
    sectionBlock: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.muted,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingVertical: theme.spacing.xs,
    },
    entryFields: {
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    entryField: {
      flex: 1,
      minWidth: 0,
    },
    entryLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.muted,
      marginBottom: 2,
    },
    addEntryBtn: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    addEntryText: {
      fontSize: 17,
      fontWeight: "500",
    },
    addAttachmentWrap: {
      marginBottom: theme.spacing.md,
    },
    attachmentCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    attachmentPress: {
      flex: 1,
    },
    attachmentTitle: {
      fontWeight: "600",
      color: theme.colors.fg,
    },
    attachmentMeta: {
      fontSize: 12,
      color: theme.colors.muted,
      marginTop: 2,
    },
    muted: {
      color: theme.colors.muted,
      paddingVertical: theme.spacing.sm,
    },
  });
