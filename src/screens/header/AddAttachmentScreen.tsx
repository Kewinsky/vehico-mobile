import { Pressable, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { AddAttachmentFiltersParams } from "../modal/AddAttachmentFiltersScreen";
import type { ServiceEntry } from "../../types/domain";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { uploadAttachment } from "../../services/attachments/attachmentsRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { openSourcePickerAlert } from "../../ui/components/common/sourcePickerAlert";
import type { SourcePickerMenuItem } from "../../ui/components/common/SourcePickerMenu";
import { useTheme } from "../../ui/ThemeProvider";
import { toastCaughtError } from "../../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "AddAttachment">;

export function AddAttachmentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<
    "date-newest" | "date-oldest" | "title-az" | "title-za"
  >("date-newest");

  const load = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      try {
        if (opts?.refreshing) setRefreshing(true);
        else setLoading(true);
        const data = await listServiceEntries(vehicleId);
        setItems(data);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload<AddAttachmentFiltersParams>({
    initialLoad: () => load(),
    pendingModalKey: "addAttachment",
    applyPendingModalResult: (pending) => {
      if (pending.sortOption) setSortOption(pending.sortOption);
    },
  });

  const hasActiveFilters = sortOption !== "date-newest";

  const openFilters = useCallback(() => {
    navigation.navigate("AddAttachmentFilters", { vehicleId, sortOption });
  }, [navigation, sortOption, vehicleId]);

  const resetFilters = useCallback(() => {
    setSortOption("date-newest");
  }, []);

  async function uploadTo(
    serviceEntryId: string,
    file: { uri: string; mimeType?: string | null; fileName?: string | null },
  ) {
    await uploadAttachment({
      serviceEntryId,
      vehicleId,
      fileUri: file.uri,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
  }

  async function pickFromCamera(serviceEntryId: string) {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadTo(serviceEntryId, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      navigation.goBack();
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery(serviceEntryId: string) {
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
      await uploadTo(serviceEntryId, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      navigation.goBack();
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  async function pickFromFiles(serviceEntryId: string) {
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
      await uploadTo(serviceEntryId, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.name,
      });
      navigation.goBack();
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  const openAttachmentSourceAlert = useCallback(
    (serviceEntryId: string) => {
      if (uploading) return;
      const items: SourcePickerMenuItem[] = [
        {
          id: "camera",
          label: t("attachments.camera"),
          onPress: () => void pickFromCamera(serviceEntryId),
        },
        {
          id: "photos",
          label: t("attachments.photos"),
          onPress: () => void pickFromGallery(serviceEntryId),
        },
        {
          id: "files",
          label: t("attachments.files"),
          onPress: () => void pickFromFiles(serviceEntryId),
        },
      ];
      openSourcePickerAlert(
        items,
        t("common.cancel"),
        t("attachments.addPickerTitle"),
        t("attachments.addPickerBody"),
      );
    },
    // Pickers are plain functions; including them would churn this callback every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, uploading],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q.length) {
      list = list.filter((item) => {
        const title = (item.title ?? "").toLowerCase();
        const date = String(item.service_date).slice(0, 10);
        const description = (item.description || "").toLowerCase();
        return title.includes(q) || date.includes(q) || description.includes(q);
      });
    }
    const [sortBy, order] = sortOption.split("-") as [string, string];
    return [...list].sort((a, b) => {
      if (sortBy === "title") {
        const cmp = (a.title ?? "").localeCompare(b.title ?? "", undefined, {
          sensitivity: "base",
        });
        return order === "az" ? cmp : -cmp;
      }
      const dateA = String(a.service_date).slice(0, 10);
      const dateB = String(b.service_date).slice(0, 10);
      return order === "newest"
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });
  }, [items, query, sortOption]);

  const headerActions: HeaderAction[] = useMemo(
    () => [
      ...(hasActiveFilters
        ? [
            {
              type: "filterReset",
              onPress: resetFilters,
            } as HeaderAction,
          ]
        : []),
      {
        type: "filter",
        onPress: openFilters,
        hasActive: hasActiveFilters,
      },
    ],
    [hasActiveFilters, openFilters, resetFilters],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
    >
      <CustomFlatList<ServiceEntry>
        data={filteredItems}
        listHeaderComponent={
          <>
            <ContentHeader title={t("documents.addAttachment")} />
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.search", { defaultValue: "Search" })}
            />
          </>
        }
        keyExtractor={(x) => x.id}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        renderItem={({ item }) => (
          <Pressable
            disabled={uploading}
            onPress={() => openAttachmentSourceAlert(item.id)}
            style={({ pressed }) => [
              styles.card,
              pressed && !uploading ? styles.cardPressed : null,
            ]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {String(item.service_date).slice(0, 10)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState body={t("documents.noServiceEntries")} />
        }
      />
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    cardPressed: {
      opacity: 0.92,
    },
    cardTitle: {
      color: theme.colors.fg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cardMeta: { marginTop: theme.spacing.xs, color: theme.colors.muted },
  });
