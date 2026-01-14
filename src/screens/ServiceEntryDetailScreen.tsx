import { useCallback, useEffect, useMemo, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Attachment, AttachmentType } from "../types/domain";
import {
  createSignedUrl,
  listAttachments,
  uploadAttachment,
} from "../services/attachments/attachmentsRepo";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryDetail">;

function labelForType(type: AttachmentType) {
  if (type === "receipt") return "Receipt";
  if (type === "invoice") return "Invoice";
  return "Photo";
}

export function ServiceEntryDetailScreen({ route }: Props) {
  const { entryId, vehicleId } = route.params;
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<AttachmentType | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAttachments(entryId);
      setItems(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canUpload = useMemo(() => uploading == null, [uploading]);

  async function pickAndUpload(type: AttachmentType) {
    try {
      setUploading(type);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Media library permission denied");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error("No file selected");

      await uploadAttachment({
        serviceEntryId: entryId,
        vehicleId,
        type,
        fileUri: asset.uri,
      });

      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setUploading(null);
    }
  }

  async function openAttachment(att: Attachment) {
    try {
      const url = await createSignedUrl(att.storage_bucket, att.storage_path);
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    }
  }

  return (
    <Screen padding={false}>
      <View style={styles.top}>
        <Text style={styles.title}>Attachments</Text>
        <Text style={styles.sub}>
          Keep supporting documents tidy and verifiable.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          onPress={() => void pickAndUpload("receipt")}
          disabled={!canUpload}
        >
          {uploading === "receipt" ? "Uploading…" : "Add receipt"}
        </Button>
        <View style={{ height: 10 }} />
        <Button
          onPress={() => void pickAndUpload("invoice")}
          variant="ghost"
          disabled={!canUpload}
        >
          {uploading === "invoice" ? "Uploading…" : "Add invoice"}
        </Button>
        <View style={{ height: 10 }} />
        <Button
          onPress={() => void pickAndUpload("photo")}
          variant="ghost"
          disabled={!canUpload}
        >
          {uploading === "photo" ? "Uploading…" : "Add photo"}
        </Button>
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No attachments yet</Text>
              <Text style={styles.emptyBody}>
                Add a receipt, invoice, or photo to support this entry.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void openAttachment(item)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{labelForType(item.type)}</Text>
            <Text style={styles.cardMeta}>
              {item.storage_bucket}/{item.storage_path.split("/").slice(-1)[0]}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.fg,
  },
  sub: {
    marginTop: 6,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  empty: {
    paddingTop: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.fg,
  },
  emptyBody: {
    marginTop: 6,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.fg,
  },
  cardMeta: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
  },
});
