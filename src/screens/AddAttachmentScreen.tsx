import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { AddAttachmentFiltersParams } from "./AddAttachmentFiltersScreen";
import type { ServiceEntry } from "../types/domain";
import { getAndClearPendingModalResult } from "../app/pendingModalResult";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { uploadAttachment } from "../services/attachments/attachmentsRepo";
import { AppNavbar } from "../ui/components/AppNavbar";
import { AppLayout } from "../ui/components/AppLayout";
import { HeaderWithSearch } from "../ui/components/HeaderWithSearch";
import { ContentHeader } from "../ui/components/ContentHeader";
import { CustomFlatList } from "../ui/components/CustomFlatList";
import { EmptyState } from "../ui/components/EmptyState";
import { useTheme } from "../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { toastError } from "../ui/toast/toast";

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
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      const pending = getAndClearPendingModalResult<AddAttachmentFiltersParams>(
        "addAttachment",
      );
      if (pending?.sortOption) setSortOption(pending.sortOption);
    }, []),
  );

  function openFilters() {
    navigation.navigate("AddAttachmentFilters", { vehicleId, sortOption });
  }

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

  function pickSource(serviceEntryId: string) {
    Alert.alert(
      t("attachments.addPickerTitle"),
      t("attachments.addPickerBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("attachments.camera"),
          onPress: () => void pickFromCamera(serviceEntryId),
        },
        {
          text: t("attachments.photos"),
          onPress: () => void pickFromGallery(serviceEntryId),
        },
        {
          text: t("attachments.files"),
          onPress: () => void pickFromFiles(serviceEntryId),
        },
      ],
    );
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
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
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
      toastError(e?.message ?? t("common.error"));
    } finally {
      setUploading(false);
    }
  }

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

  const renderHeaderRight = (
    openSearch: () => void,
    hasSearchQuery: boolean,
  ) => (
    <View style={styles.headerRight}>
      <Pressable
        onPress={openSearch}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed && styles.headerIconBtnPressed,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={22}
          color={hasSearchQuery ? theme.colors.accent : theme.colors.fg}
        />
      </Pressable>
      <Pressable
        onPress={openFilters}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed && styles.headerIconBtnPressed,
        ]}
      >
        <Ionicons
          name="filter-outline"
          size={22}
          color={theme.colors.fg}
        />
      </Pressable>
    </View>
  );

  return (
    <AppLayout
      loading={loading}
      header={
        <HeaderWithSearch
          query={query}
          onQueryChange={setQuery}
          placeholder={t("common.search", { defaultValue: "Search" })}
          cancelLabel={t("common.cancel")}
          renderHeaderContent={(openSearch, hasSearchQuery) => (
            <AppNavbar
              onBack={() => navigation.goBack()}
              right={renderHeaderRight(openSearch, hasSearchQuery)}
            />
          )}
        />
      }
    >
      <CustomFlatList<ServiceEntry>
        data={filteredItems}
        listHeaderComponent={
          <ContentHeader title={t("documents.addAttachment")} />
        }
        keyExtractor={(x) => x.id}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pickSource(item.id)}
            disabled={uploading}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {String(item.service_date).slice(0, 10)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState body={t("documents.noServiceEntries")} />
        }
      />
    </AppLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerIconBtn: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    headerIconBtnPressed: {
      opacity: 0.6,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardTitle: {
      color: theme.colors.fg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cardMeta: { marginTop: theme.spacing.xs, color: theme.colors.muted },
  });
