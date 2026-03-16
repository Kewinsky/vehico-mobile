import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { EmptyState } from "../../ui/components/common/EmptyState";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import type { Attachment, VehicleDocument } from "../../types/domain";
import {
  deleteAttachment,
  listVehicleAttachments,
  type VehicleAttachment,
} from "../../services/attachments/attachmentsRepo";
import {
  getAttachmentOpenUrl,
  getVehicleDocumentOpenUrl,
  getFileNameFromItem,
} from "../../services/storage/openFileUrl";
import {
  deleteVehicleDocument,
  listVehicleDocuments,
  updateVehicleDocument,
  uploadVehicleDocument,
} from "../../services/vehicleDocuments/vehicleDocumentsRepo";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { IconButton } from "../../ui/components/common/IconButton";
import { Feather } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "Documents">;

export function DocumentsScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [attachments, setAttachments] = useState<VehicleAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"documents" | "attachments">(
    "documents",
  );

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
    [route.params.vehicleId, t],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
  });

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
      ],
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

  function openAddPicker() {
    Alert.alert(t("documents.addVehicleDocument"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("documents.addVehicleDocument"),
        onPress: () => pickVehicleDocument(),
      },
      {
        text: t("documents.addAttachment"),
        onPress: () =>
          navigation.navigate("AddAttachment", {
            vehicleId: route.params.vehicleId,
          }),
      },
    ]);
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
              const updatedDoc = await updateVehicleDocument(
                doc.id,
                description || null,
              );
              setVehicleDocs((prev) =>
                prev.map((item) => (item.id === doc.id ? updatedDoc : item)),
              );
              toastSuccess(t("documents.descriptionUpdated"));
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      doc.description || "",
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
      ],
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
      ],
    );
  }

  const headerActions: HeaderAction[] = useMemo(
    () => [
      {
        type: "add",
        onPress: openAddPicker,
      },
    ],
    [openAddPicker],
  );

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
      title={t("dashboard.tiles.docsTitle")}
    >
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t("common.search", { defaultValue: "Search" })}
      />
      <View style={styles.tabsWrap}>
        <SegmentTabs<"documents" | "attachments">
          value={activeTab}
          options={[
            { value: "documents", label: t("documents.vehicleDocuments") },
            {
              value: "attachments",
              label: t("documents.serviceAttachments"),
            },
          ]}
          onChange={setActiveTab}
          variant="secondary"
        />
      </View>

      {activeTab === "documents" ? (
        <>
          {vehicleDocs
            .filter((d) => {
              const q = query.trim().toLowerCase();
              if (!q.length) return true;
              const description = d.description || "";
              return description.toLowerCase().includes(q);
            })
            .map((item) => (
              <View key={item.id} style={{ marginBottom: theme.spacing.sm }}>
                <ListRowWithActions
                  title={item.description || t("documents.documentLabel")}
                  subtitle={(() => {
                    const fileName = getFileNameFromItem(item);
                    const ext =
                      fileName.split(".").pop()?.toUpperCase() || "FILE";
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString(
                      i18n.language === "pl" ? "pl-PL" : "en-US",
                      { day: "2-digit", month: "2-digit", year: "numeric" },
                    );
                    return `${t("documents.added")} ${formattedDate} · ${ext}`;
                  })()}
                  onPress={() => void openVehicleDocument(item)}
                  trailing={
                    <>
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
                    </>
                  }
                />
              </View>
            ))}
          {vehicleDocs.filter((d) => {
            const q = query.trim().toLowerCase();
            if (!q.length) return true;
            const description = d.description || "";
            return description.toLowerCase().includes(q);
          }).length === 0 ? (
            <EmptyState body={t("documents.noVehicleDocuments")} />
          ) : null}
        </>
      ) : (
        <>
          {attachments
            .filter((a) => {
              const q = query.trim().toLowerCase();
              if (!q.length) return true;
              const title = a.serviceEntryTitle || "";
              return title.toLowerCase().includes(q);
            })
            .map((item) => (
              <View key={item.id} style={{ marginBottom: theme.spacing.sm }}>
                <ListRowWithActions
                  title={
                    item.serviceEntryTitle
                      ? item.serviceEntryTitle
                      : t("documents.attachmentLabel")
                  }
                  subtitle={(() => {
                    const fileName = getFileNameFromItem(item);
                    const ext =
                      fileName.split(".").pop()?.toUpperCase() || "FILE";
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString(
                      i18n.language === "pl" ? "pl-PL" : "en-US",
                      { day: "2-digit", month: "2-digit", year: "numeric" },
                    );
                    return `${t("documents.added")} ${formattedDate} · ${ext}`;
                  })()}
                  onPress={() => void openAttachment(item)}
                  trailing={
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
                  }
                />
              </View>
            ))}
          {attachments.filter((a) => {
            const q = query.trim().toLowerCase();
            if (!q.length) return true;
            const title = a.serviceEntryTitle || "";
            return title.toLowerCase().includes(q);
          }).length === 0 ? (
            <EmptyState body={t("documents.noAttachments")} />
          ) : null}
        </>
      )}
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    body: {
      lineHeight: theme.typography.body + 6,
    },
    section: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    tabsWrap: {
      marginBottom: theme.spacing.sm,
    },
    card: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      minHeight: 120,
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
