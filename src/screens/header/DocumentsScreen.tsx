import { Alert, Animated, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderIconButton } from "../../ui/components/layout/HeaderIconButton";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useMemo, useState } from "react";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../../ui/components/common/SwipeActions";
import { Plus, SquarePen, Trash2 } from "lucide-react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { SourcePickerMenu } from "../../ui/components/common/SourcePickerMenu";
import type { SourcePickerMenuItem } from "../../ui/components/common/SourcePickerMenu";
import { useTheme } from "../../ui/ThemeProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import type { Attachment, VehicleDocument } from "../../types/domain";
import {
  deleteAttachment,
  listVehicleAttachments,
  type VehicleAttachment,
} from "../../services/attachments/attachmentsRepo";
import { getFileNameFromItem } from "../../services/storage/openFileUrl";
import {
  LocalFileNotFoundError,
  openLocalFile,
} from "../../services/storage/openLocalFile";
import {
  deleteVehicleDocument,
  listVehicleDocuments,
  updateVehicleDocument,
  uploadVehicleDocument,
} from "../../services/vehicleDocuments/vehicleDocumentsRepo";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { getUserFacingErrorMessage } from "../../ui/errors/userFacingError";
import {
  toastCaughtError,
  toastError,
  toastSuccess,
} from "../../ui/toast/toast";
import { promptAlert } from "../../ui/prompt/promptAlert";

type Props = NativeStackScreenProps<AppStackParamList, "Documents">;

export function DocumentsScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [attachments, setAttachments] = useState<VehicleAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUploading] = useState(false);
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
        toastCaughtError(e, t("common.error"));
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

  async function openVehicleDocument(doc: VehicleDocument) {
    if (!doc.local_path) {
      toastError(t("common.error"));
      return;
    }
    try {
      await openLocalFile(doc.local_path);
    } catch (e: any) {
      toastError(
        e instanceof LocalFileNotFoundError
          ? t("documents.fileNotFound")
          : getUserFacingErrorMessage(e, t("common.error")),
      );
    }
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
      toastCaughtError(e, t("common.error"));
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
      toastCaughtError(e, t("common.error"));
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
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  const documentsAddMenuItems = useMemo(
    (): SourcePickerMenuItem[] => [
      {
        id: "vehicle-document",
        label: t("documents.addVehicleDocument"),
        systemImage: "doc.badge.plus",
        items: [
          {
            id: "camera",
            label: t("attachments.camera"),
            systemImage: "camera",
            onPress: () => void pickDocFromCamera(),
          },
          {
            id: "photos",
            label: t("attachments.photos"),
            systemImage: "photo.on.rectangle",
            onPress: () => void pickDocFromGallery(),
          },
          {
            id: "files",
            label: t("attachments.files"),
            systemImage: "doc",
            onPress: () => void pickDocFromFiles(),
          },
        ],
      },
      {
        id: "attachment",
        label: t("documents.addAttachment"),
        systemImage: "paperclip",
        onPress: () =>
          navigation.navigate("AddAttachment", {
            vehicleId: route.params.vehicleId,
          }),
      },
    ],
    // Pickers are plain functions; including them would churn this memo every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation, route.params.vehicleId, t],
  );

  const headerRight = useMemo(
    () => (
      <SourcePickerMenu items={documentsAddMenuItems}>
        <HeaderIconButton
          onPress={() => undefined}
          tintColor={theme.colors.accent}
          accessibilityLabel="Add"
        >
          <Plus size={20} color={theme.colors.accent} />
        </HeaderIconButton>
      </SourcePickerMenu>
    ),
    [documentsAddMenuItems, theme.colors.accent],
  );

  async function editDocumentDescription(doc: VehicleDocument) {
    promptAlert(
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
              toastCaughtError(e, t("common.error"));
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
              toastCaughtError(e, t("common.error"));
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
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
    );
  }

  function renderDocumentRightActions(
    item: VehicleDocument,
    progress: Animated.AnimatedInterpolation<number>,
  ) {
    return (
      <SwipeActionsRow
        progress={progress}
        actions={[
          {
            onPress: () => void editDocumentDescription(item),
            color: theme.colors.accent,
            icon: <SquarePen size={22} color="#000000" />,
          },
          {
            onPress: () => confirmDeleteVehicleDoc(item),
            color: theme.colors.danger,
            icon: <Trash2 size={22} color="#000000" />,
          },
        ]}
      />
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
            onPress: () => confirmDeleteAttachment(item),
            color: theme.colors.danger,
            icon: <Trash2 size={22} color="#000000" />,
          },
        ]}
      />
    );
  }

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      right={headerRight}
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
                <ExclusiveSwipeable
                  renderRightActions={(progress) =>
                    renderDocumentRightActions(item, progress)
                  }
                  rightThreshold={32}
                >
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
                  />
                </ExclusiveSwipeable>
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
                <ExclusiveSwipeable
                  renderRightActions={(progress) =>
                    renderAttachmentRightActions(item, progress)
                  }
                  rightThreshold={32}
                >
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
                  />
                </ExclusiveSwipeable>
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
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
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
