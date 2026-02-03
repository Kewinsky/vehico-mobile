import {
  Alert,
  Linking,
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

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Attachment, VehicleDocument } from "../types/domain";
import {
  deleteAttachment,
  listVehicleAttachments,
  type VehicleAttachment,
} from "../services/attachments/attachmentsRepo";
import {
  getAttachmentOpenUrl,
  getVehicleDocumentOpenUrl,
  getFileNameFromItem,
} from "../services/storage/openFileUrl";
import {
  deleteVehicleDocument,
  listVehicleDocuments,
  updateVehicleDocument,
  uploadVehicleDocument,
} from "../services/vehicleDocuments/vehicleDocumentsRepo";
import { Button } from "../ui/components/Button";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import { TextField } from "../ui/components/TextField";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Documents">;

export function DocumentsScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [attachments, setAttachments] = useState<VehicleAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");

  const totalCount = vehicleDocs.length + attachments.length;

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [d, a] = await Promise.all([
          listVehicleDocuments(route.params.vehicleId),
          listVehicleAttachments(route.params.vehicleId),
        ]);
        setVehicleDocs(d);
        setAttachments(a);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [route.params.vehicleId, t]
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
    return unsub;
  }, [navigation, load]);

  function openVehicleDocument(doc: VehicleDocument) {
    try {
      const url = getVehicleDocumentOpenUrl(doc);
      void Linking.openURL(url);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function openAttachment(att: Attachment) {
    try {
      const url = getAttachmentOpenUrl(att);
      void Linking.openURL(url);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  async function editDocumentDescription(doc: VehicleDocument) {
    Alert.prompt(
      t("documents.editDescriptionTitle"),
      t("documents.editDescriptionBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (description: string | undefined) => {
            try {
              await updateVehicleDocument(doc.id, description || null);
              await load();
              toastSuccess(t("documents.descriptionUpdated"));
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      doc.description || ""
    );
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
              toastError(e?.message ?? t("common.error"));
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
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ]
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("dashboard.tiles.docsTitle")}
          </Text>
          <Text style={styles.subtitle}>
            {t("dashboard.tiles.docsSubtitle")}
          </Text>
          <Text style={[styles.countInfo, { color: theme.colors.muted }]}>
            {t("documents.countInfo", {
              docCount: vehicleDocs.length,
              attCount: attachments.length,
              total: totalCount,
            })}
          </Text>
        </View>
        <View style={{ height: theme.spacing.sm }} />
        <TextField
          noMarginTop
          value={query}
          onChangeText={setQuery}
          placeholder={t("documents.searchPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          blurOnSubmit={true}
        />
        <View style={{ height: theme.spacing.sm }} />
        <View style={styles.buttonsRow}>
          <View style={{ flex: 1 }}>
            <Button
              onPress={pickVehicleDocument}
              variant="ghost"
              disabled={uploading}
            >
              {t("documents.addVehicleDocument")}
            </Button>
          </View>
          <View style={{ width: theme.spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Button
              onPress={() =>
                navigation.navigate("AddAttachment", {
                  vehicleId: route.params.vehicleId,
                })
              }
              variant="ghost"
            >
              {t("documents.addAttachment")}
            </Button>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("documents.vehicleDocuments")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        {vehicleDocs
          .filter((d) => {
            const q = query.trim().toLowerCase();
            if (!q.length) return true;
            const description = d.description || "";
            return description.toLowerCase().includes(q);
          })
          .map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
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
                    onPress={() => void openVehicleDocument(item)}
                  >
                    <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                      {item.description || t("documents.documentLabel")}
                    </Text>
                    <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                      {(() => {
                        const fileName = getFileNameFromItem(item);
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
                  <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                    <IconButton
                      onPress={() => editDocumentDescription(item)}
                      variant="ghost"
                    >
                      <Feather
                        name="edit"
                        size={24}
                        color={theme.colors.accent}
                      />
                    </IconButton>
                    <IconButton
                      onPress={() => confirmDeleteVehicleDoc(item)}
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
              </View>
            </View>
          ))}
        {loading && vehicleDocs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : vehicleDocs.filter((d) => {
            const q = query.trim().toLowerCase();
            if (!q.length) return true;
            const description = d.description || "";
            return description.toLowerCase().includes(q);
          }).length === 0 ? (
          <Text
            style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}
          >
            {t("documents.noVehicleDocuments")}
          </Text>
        ) : null}

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("documents.serviceAttachments")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        {attachments
          .filter((a) => {
            const q = query.trim().toLowerCase();
            if (!q.length) return true;
            const title = a.serviceEntryTitle || "";
            return title.toLowerCase().includes(q);
          })
          .map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
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
                    onPress={() => void openAttachment(item)}
                  >
                    <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                      {item.serviceEntryTitle
                        ? item.serviceEntryTitle
                        : t("documents.attachmentLabel")}
                    </Text>
                    <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                      {(() => {
                        const fileName = getFileNameFromItem(item);
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
                      size={24}
                      color={theme.colors.danger}
                    />
                  </IconButton>
                </View>
              </View>
            </View>
          ))}
        {attachments.filter((a) => {
          const q = query.trim().toLowerCase();
          if (!q.length) return true;
          const title = a.serviceEntryTitle || "";
          return title.toLowerCase().includes(q);
        }).length === 0 && !loading ? (
          <Text
            style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}
          >
            {t("documents.noAttachments")}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: { fontSize: theme.typography.small, color: theme.colors.muted },
    countInfo: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs / 2,
    },
    body: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 6,
    },
    section: {
      marginTop: theme.spacing.sm - 2,
      fontSize: 16,
      fontWeight: "800",
    },
    buttonsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    trash: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
  });
