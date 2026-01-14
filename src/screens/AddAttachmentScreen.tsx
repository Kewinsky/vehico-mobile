import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { ServiceEntry } from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { uploadAttachment } from "../services/attachments/attachmentsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
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

  const load = useCallback(async (opts?: { refreshing?: boolean }) => {
    try {
      if (opts?.refreshing) setRefreshing(true);
      else setLoading(true);
      const data = await listServiceEntries(vehicleId);
      setItems(data);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      if (opts?.refreshing) setRefreshing(false);
      else setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadTo(serviceEntryId: string, file: { uri: string; mimeType?: string | null; fileName?: string | null }) {
    await uploadAttachment({
      serviceEntryId,
      vehicleId,
      fileUri: file.uri,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
  }

  function pickSource(serviceEntryId: string) {
    Alert.alert(t("attachments.addPickerTitle"), t("attachments.addPickerBody"), [
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
    ]);
  }

  async function pickFromCamera(serviceEntryId: string) {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadTo(serviceEntryId, { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery(serviceEntryId: string) {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error(t("attachments.galleryPermissionDenied"));
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      await uploadTo(serviceEntryId, { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
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
      await uploadTo(serviceEntryId, { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.name });
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg }}>
        <Text style={styles.h1}>{t("documents.addAttachment")}</Text>
        <View style={{ height: 12 }} />

        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          refreshing={refreshing}
          onRefresh={() => void load({ refreshing: true })}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <Pressable onPress={() => pickSource(item.id)} disabled={uploading} style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{String(item.service_date).slice(0, 10)}</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            !loading ? <Text style={{ color: theme.colors.muted }}>{t("documents.noServiceEntries")}</Text> : null
          }
        />

        <View style={{ height: 12 }} />
        <Button onPress={() => navigation.goBack()} variant="ghost">
          {t("common.cancel")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
    card: { borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing.md },
    cardTitle: { color: theme.colors.fg, fontWeight: "800" },
    cardMeta: { marginTop: 4, color: theme.colors.muted },
  });

