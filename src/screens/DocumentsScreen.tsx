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
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useCallback, useEffect, useState } from "react";
import type {
  Attachment,
  VehicleDocument,
  VehiclePhoto,
} from "../types/domain";
import {
  createSignedUrl,
  deleteAttachment,
  listVehicleAttachments,
  type VehicleAttachment,
} from "../services/attachments/attachmentsRepo";
import {
  deleteVehiclePhoto,
  listVehiclePhotos,
  uploadVehiclePhoto,
} from "../services/vehiclePhotos/vehiclePhotosRepo";
import {
  deleteVehicleDocument,
  listVehicleDocuments,
  uploadVehicleDocument,
} from "../services/vehicleDocuments/vehicleDocumentsRepo";
import { Button } from "../ui/components/Button";
import { toastError } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "Documents">;

export function DocumentsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [attachments, setAttachments] = useState<VehicleAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, d, a] = await Promise.all([
        listVehiclePhotos(route.params.vehicleId),
        listVehicleDocuments(route.params.vehicleId),
        listVehicleAttachments(route.params.vehicleId),
      ]);
      setPhotos(p);
      setVehicleDocs(d);
      setAttachments(a);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [route.params.vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  async function openStorage(bucket: string, path: string) {
    try {
      const url = await createSignedUrl(bucket, path);
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  function pickVehicleDocument() {
    Alert.alert(
      t("documents.addVehicleDocument"),
      t("attachments.addPickerBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("attachments.camera"),
          onPress: () => void pickDocFromCamera(),
        },
        {
          text: t("attachments.photos"),
          onPress: () => void pickDocFromGallery(),
        },
        {
          text: t("attachments.files"),
          onPress: () => void pickDocFromFiles(),
        },
      ]
    );
  }

  function pickVehiclePhoto() {
    Alert.alert(
      t("documents.addVehiclePhoto"),
      t("attachments.addPickerBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("attachments.camera"),
          onPress: () => void pickPhotoFromCamera(),
        },
        {
          text: t("attachments.photos"),
          onPress: () => void pickPhotoFromGallery(),
        },
      ]
    );
  }

  async function pickPhotoFromCamera() {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadVehiclePhoto({
        vehicleId: route.params.vehicleId,
        fileUri: asset.uri,
      });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickPhotoFromGallery() {
    try {
      setUploading(true);
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
      await uploadVehiclePhoto({
        vehicleId: route.params.vehicleId,
        fileUri: asset.uri,
      });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickDocFromCamera() {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadVehicleDocument({
        vehicleId: route.params.vehicleId,
        fileUri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickDocFromGallery() {
    try {
      setUploading(true);
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
      await uploadVehicleDocument({
        vehicleId: route.params.vehicleId,
        fileUri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickDocFromFiles() {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadVehicleDocument({
        vehicleId: route.params.vehicleId,
        fileUri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.name,
      });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  function confirmDeleteVehicleDoc(doc: VehicleDocument) {
    Alert.alert(
      t("documents.removeAttachmentTitle"),
      t("documents.removeAttachmentBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleDocument(doc);
              setVehicleDocs((prev) => prev.filter((x) => x.id !== doc.id));
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  function confirmDeletePhoto(photo: VehiclePhoto) {
    Alert.alert(
      t("documents.removePhotoTitle"),
      t("documents.removePhotoBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehiclePhoto(photo);
              setPhotos((prev) => prev.filter((x) => x.id !== photo.id));
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  function confirmDeleteAttachment(att: Attachment) {
    Alert.alert(
      t("documents.removeAttachmentTitle"),
      t("documents.removeAttachmentBody"),
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

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
        }}
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("documents.title")}
        </Text>

        <View style={{ height: 12 }} />
        <Button
          onPress={() =>
            navigation.navigate("AddAttachment", {
              vehicleId: route.params.vehicleId,
              title: route.params.title,
            })
          }
          variant="ghost"
        >
          {t("documents.addAttachment")}
        </Button>
        <View style={{ height: 10 }} />
        <Button onPress={pickVehiclePhoto} variant="ghost" disabled={uploading}>
          {t("documents.addVehiclePhoto")}
        </Button>
        <View style={{ height: 10 }} />
        <Button
          onPress={pickVehicleDocument}
          variant="ghost"
          disabled={uploading}
        >
          {t("documents.addVehicleDocument")}
        </Button>

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("documents.vehiclePhotos")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    void openStorage(item.storage_bucket, item.storage_path)
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {t("documents.photoLabel")}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                    {item.storage_path.split("/").slice(-1)[0]}
                  </Text>
                </Pressable>
                <IconButton onPress={() => confirmDeletePhoto(item)} variant="danger">
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </IconButton>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("common.loading")}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("documents.noPhotos")}
              </Text>
            )
          }
        />

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("documents.vehicleDocuments")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        <FlatList
          data={vehicleDocs}
          keyExtractor={(d) => d.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    void openStorage(item.storage_bucket, item.storage_path)
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {t("documents.attachmentLabel")}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                    {item.storage_bucket}/
                    {item.storage_path.split("/").slice(-1)[0]}
                  </Text>
                </Pressable>
                <IconButton onPress={() => confirmDeleteVehicleDoc(item)} variant="danger">
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </IconButton>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("common.loading")}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("documents.noVehicleDocuments")}
              </Text>
            )
          }
        />

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("documents.serviceAttachments")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        <FlatList
          data={attachments}
          keyExtractor={(a) => a.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    void openStorage(item.storage_bucket, item.storage_path)
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {item.serviceEntryTitle
                      ? item.serviceEntryTitle
                      : t("documents.attachmentLabel")}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                    {item.storage_path.split("/").slice(-1)[0]}
                  </Text>
                </Pressable>
                <IconButton onPress={() => confirmDeleteAttachment(item)} variant="danger">
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </IconButton>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("common.loading")}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("documents.noAttachments")}
              </Text>
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800" },
  body: { marginTop: 8, lineHeight: 22 },
  section: { marginTop: 10, fontSize: 16, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trash: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
