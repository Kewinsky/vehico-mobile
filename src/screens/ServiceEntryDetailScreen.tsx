import { useCallback, useEffect, useState } from "react";
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

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Attachment } from "../types/domain";
import {
  createSignedUrl,
  listAttachments,
} from "../services/attachments/attachmentsRepo";
import {
  deleteServiceEntry,
  getServiceEntry,
} from "../services/serviceEntries/serviceEntriesRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryDetail">;

export function ServiceEntryDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = makeStyles(theme);
  const { entryId, vehicleId } = route.params;
  const [entry, setEntry] = useState<any>(null);
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const currency = settings?.currency ?? "PLN";

  const load = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      try {
        if (opts?.refreshing) setRefreshing(true);
        else setLoading(true);
        const e = await getServiceEntry(entryId);
        setEntry(e);
        const data = await listAttachments(entryId);
        setItems(data);
      } catch (e: any) {
        toastError(t("common.error"), e?.message ?? String(e));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [entryId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function openAttachment(att: Attachment) {
    try {
      const url = await createSignedUrl(att.storage_bucket, att.storage_path);
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  function onDeleteEntry() {
    Alert.alert(t("entryDetail.deleteTitle"), t("entryDetail.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceEntry(entryId);
            navigation.goBack();
          } catch (e: any) {
            toastError(t("common.error"), e?.message ?? String(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t("entryDetail.title")}</Text>
          <Pressable
            onPress={() =>
              navigation.navigate("ServiceEntryForm", { vehicleId, entryId })
            }
            hitSlop={10}
          >
            <Text style={styles.editLink}>{t("common.edit")}</Text>
          </Pressable>
        </View>

        {entry ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{entry.title}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("entryDetail.labels.serviceDate")}
              </Text>
              <Text style={styles.value}>
                {String(entry.service_date).slice(0, 10)}
              </Text>
            </View>
            {entry.mileage != null ? (
              <View style={styles.row}>
                <Text style={styles.label}>
                  {t("entryDetail.labels.mileage")}
                </Text>
                <Text style={styles.value}>
                  {entry.mileage} {distanceUnit}
                </Text>
              </View>
            ) : null}
            {entry.cost != null ? (
              <View style={styles.row}>
                <Text style={styles.label}>{t("entryDetail.labels.cost")}</Text>
                <Text style={styles.value}>
                  {entry.cost} {currency}
                </Text>
              </View>
            ) : null}
            {entry.description ? (
              <>
                <View style={styles.row} />
                <Text style={styles.label}>
                  {t("entryDetail.labels.description")}
                </Text>
                <Text style={styles.bodyValue}>
                  {String(entry.description)}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.h2}>{t("attachments.title")}</Text>
        <Text style={styles.muted}>{t("attachments.subtitle")}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.muted}>{t("common.loading")}</Text>
          ) : (
            <Text style={styles.muted}>
              {t("entryDetail.attachmentsEmptyTitle")}
            </Text>
          )
        }
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
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <View style={styles.actions}>
        <Button onPress={onDeleteEntry} variant="destructive">
          {t("common.delete")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h2: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    top: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    detailsCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    detailsTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    value: {
      fontSize: theme.typography.small,
      fontWeight: "400",
      color: theme.colors.fg,
    },
    bodyValue: { marginTop: 6, color: theme.colors.fg, lineHeight: 20 },
    sectionHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.fg },
    actions: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    list: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
