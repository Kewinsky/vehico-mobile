import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type { Attachment, ServiceEntryCategory } from "../types/domain";
import {
  createServiceEntry,
  getServiceEntry,
  updateServiceEntry,
} from "../services/serviceEntries/serviceEntriesRepo";
import {
  createSignedUrl,
  deleteAttachment,
  listAttachments,
  uploadAttachment,
} from "../services/attachments/attachmentsRepo";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { DateField } from "../ui/components/DateField";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useUserSettings();
  const { vehicleId, entryId } = route.params as any;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [mileage, setMileage] = useState("");
  const [category, setCategory] = useState<ServiceEntryCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<
    { uri: string; mimeType?: string | null; fileName?: string | null }[]
  >([]);

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
    if (!entryId) return;
    void (async () => {
      try {
        const e = await getServiceEntry(entryId);
        setServiceDate(e.service_date);
        setMileage(e.mileage != null ? String(e.mileage) : "");
        setCategory((e.category as ServiceEntryCategory | null) ?? "other");
        setTitle(e.title);
        setDescription(e.description ?? "");
        setCost(e.cost != null ? String(e.cost) : "");
        await reloadAttachments(entryId);
      } catch (err: any) {
        toastError(t("common.error"), err?.message ?? String(err));
      }
    })();
  }, [entryId, reloadAttachments, t]);

  async function openAttachment(att: Attachment) {
    try {
      const url = await createSignedUrl(att.storage_bucket, att.storage_path);
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
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
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  const canSave = useMemo(() => {
    return (
      serviceDate.trim().length === 10 &&
      title.trim().length > 0 &&
      category != null
    );
  }, [serviceDate, title, category]);

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
        await uploadAttachment({
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
        await uploadAttachment({
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
        await uploadAttachment({
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
      const payload = {
        vehicle_id: vehicleId,
        service_date: serviceDate.trim(),
        mileage: mileage.trim().length ? Number(mileage) : null,
        category,
        title: title.trim(),
        description: description.trim(),
        cost: cost.trim().length ? Number(cost) : null,
      };

      if (entryId) {
        await updateServiceEntry(entryId, payload);
      } else {
        const created = await createServiceEntry(payload);
        if (pendingFiles.length) {
          setUploading(true);
          for (const f of pendingFiles) {
            await uploadAttachment({
              serviceEntryId: created.id,
              vehicleId,
              fileUri: f.uri,
              mimeType: f.mimeType,
              fileName: f.fileName,
            });
          }
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
      <View style={{ height: theme.spacing.lg }} />
      <Text style={styles.h1}>
        {entryId ? t("entryForm.editTitle") : t("entryForm.title")}
      </Text>

      <DateField
        noMarginTop
        label={t("entryForm.serviceDate")}
        value={serviceDate}
        onChange={setServiceDate}
        disabled={saving || uploading}
      />

      <PickerField
        label={t("entryForm.category")}
        value={category}
        options={["maintenance", "repair", "inspection", "upgrade", "other"] as const}
        getLabel={(value) =>
          t(`entryForm.categories.${value}` as any)
        }
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

      <TextField
        label={t("entryForm.entryTitle")}
        value={title}
        onChangeText={setTitle}
        placeholder={t("entryForm.placeholderTitle")}
      />

      <TextField
        label={t("entryForm.description")}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder={t("entryForm.placeholderDescription")}
      />

      <TextField
        label={t("entryForm.cost")}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder={t("entryForm.placeholderCost")}
      />

      <View style={{ height: 12 }} />
      <View style={styles.sectionHeader}>
        <Text style={styles.h2}>{t("attachments.title")}</Text>
      </View>
      <View style={{ height: 10 }} />
      <Button
        onPress={pickAttachment}
        variant="ghost"
        disabled={saving || uploading}
      >
        {t("entryForm.addAttachment")}
      </Button>
      <View style={{ height: 10 }} />

      {entryId ? (
        <FlatList
          data={attachments}
          keyExtractor={(a) => a.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
                      const fileName = item.storage_path
                        .split("/")
                        .slice(-1)[0];
                      const ext =
                        fileName.split(".").pop()?.toUpperCase() || "FILE";
                      const date = new Date(item.created_at);
                      const formattedDate = date.toLocaleDateString(
                        i18n.language === "pl" ? "pl-PL" : "en-US",
                        { day: "2-digit", month: "2-digit", year: "numeric" }
                      );
                      return `${t(
                        "documents.added"
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
                    size={18}
                    color={theme.colors.danger}
                  />
                </IconButton>
              </View>
            </View>
          )}
          ListEmptyComponent={
            attachmentsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                  variant="danger"
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
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
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: 20,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
      color: theme.colors.fg,
    },
    label: { fontSize: 13, fontWeight: "800", color: theme.colors.muted },
    h2: { fontSize: 16, fontWeight: "800", color: theme.colors.fg },
    sectionHeader: { gap: 6 },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    pending: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.muted,
    },
    notice: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: 16,
    },
    noticeText: {
      fontSize: 13,
      lineHeight: 18,
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
    cardMeta: { marginTop: 4, fontSize: 13, color: theme.colors.muted },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
