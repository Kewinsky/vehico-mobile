import { useEffect, useMemo, useState } from "react";
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
import type { Attachment } from "../types/domain";
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
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryForm">;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useUserSettings();
  const { vehicleId, entryId } = route.params as any;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [mileage, setMileage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<
    { uri: string; mimeType?: string | null; fileName?: string | null }[]
  >([]);

  useEffect(() => {
    if (!entryId) return;
    void (async () => {
      try {
        const e = await getServiceEntry(entryId);
        setServiceDate(e.service_date);
        setMileage(e.mileage != null ? String(e.mileage) : "");
        setTitle(e.title);
        setDescription(e.description ?? "");
        setCost(e.cost != null ? String(e.cost) : "");
        const atts = await listAttachments(entryId);
        setAttachments(atts);
      } catch (err: any) {
        toastError(t("common.error"), err?.message ?? String(err));
      }
    })();
  }, [entryId, t]);

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
    return serviceDate.trim().length === 10 && title.trim().length > 0;
  }, [serviceDate, title]);

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
        const atts = await listAttachments(entryId);
        setAttachments(atts);
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
        const atts = await listAttachments(entryId);
        setAttachments(atts);
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
        const atts = await listAttachments(entryId);
        setAttachments(atts);
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
      const payload = {
        vehicle_id: vehicleId,
        service_date: serviceDate.trim(),
        mileage: mileage.trim().length ? Number(mileage) : null,
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
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.lg }} />
      <Text style={styles.h1}>
        {entryId ? t("entryForm.editTitle") : t("entryForm.title")}
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t("entryForm.ocrDisclaimer")}</Text>
      </View>

      <TextField
        noMarginTop
        label={t("entryForm.serviceDate")}
        value={serviceDate}
        onChangeText={setServiceDate}
        placeholder="YYYY-MM-DD"
      />

      <TextField
        label={`${t("entryForm.mileage")} (${distanceUnit})`}
        value={mileage}
        onChangeText={setMileage}
        keyboardType="number-pad"
      />

      <TextField
        label={t("entryForm.entryTitle")}
        value={title}
        onChangeText={setTitle}
      />

      <TextField
        label={t("entryForm.description")}
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.multiline}
      />

      <TextField
        label={t("entryForm.cost")}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
      />

      {entryId ? (
        <>
          <View style={{ height: 12 }} />
          <View style={styles.sectionHeader}>
            <Text style={styles.h2}>{t("attachments.title")}</Text>
            <Text style={styles.muted}>{t("attachments.subtitle")}</Text>
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
                      {item.storage_bucket}/
                      {item.storage_path.split("/").slice(-1)[0]}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteAttachment(item)}
                    hitSlop={10}
                    style={styles.trash}
                  >
                    <Text style={styles.trashText}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !uploading && attachments.length === 0 ? (
                <Text style={styles.muted}>
                  {t("entryForm.attachmentsEmpty")}
                </Text>
              ) : null
            }
          />
        </>
      ) : (
        <>
          <View style={{ height: 10 }} />
          <Button
            onPress={pickAttachment}
            variant="ghost"
            disabled={saving || uploading}
          >
            {t("entryForm.addAttachment")}
          </Button>
          {pendingFiles.length ? (
            <Text style={styles.pending}>
              {t("entryForm.pendingAttachments", {
                count: pendingFiles.length,
              })}
            </Text>
          ) : null}
        </>
      )}

      <View style={{ height: 16 }} />
      <Button onPress={onSave} disabled={!canSave || saving}>
        {t("common.save")}
      </Button>
      <View style={{ height: 10 }} />
      <Button
        onPress={() => navigation.goBack()}
        variant="ghost"
        disabled={saving}
      >
        {t("common.cancel")}
      </Button>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 12,
      color: theme.colors.fg,
    },
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
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    trash: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    trashText: { color: theme.colors.danger, fontWeight: "900" },
    cardTitle: { fontWeight: "800", color: theme.colors.fg },
    cardMeta: { marginTop: 4, fontSize: 13, color: theme.colors.muted },
    multiline: {
      height: 96,
      paddingTop: 12,
      textAlignVertical: "top",
    },
  });
