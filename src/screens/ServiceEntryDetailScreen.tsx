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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceEntryDetail">;

export function ServiceEntryDetailScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
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
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [entryId, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function openAttachment(att: Attachment) {
    try {
      const url = await createSignedUrl(att.storage_bucket, att.storage_path);
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function onDelete() {
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
            toastError(e?.message ?? t("common.error"));
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
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() =>
                navigation.navigate("ServiceEntryForm", { vehicleId, entryId })
              }
              hitSlop={10}
            >
              <Text style={styles.editLink}>{t("common.edit")}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete()} hitSlop={10}>
              <Text style={styles.deleteLink}>{t("common.delete")}</Text>
            </Pressable>
          </View>
        </View>

        {entry ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{entry.title}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("entryDetail.labels.serviceDate")}
              </Text>
              <Text style={styles.value}>
                {String(entry.service_date).slice(0, 10)}
              </Text>
            </View>
            {entry.category ? (
              <View style={styles.row}>
                <Text style={styles.label}>
                  {t("entryDetail.labels.category")}
                </Text>
                <Text style={styles.value}>
                  {t(`entryForm.categories.${entry.category}` as any)}
                </Text>
              </View>
            ) : null}
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
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
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
                  {(() => {
                    const fileName = item.storage_path.split("/").slice(-1)[0];
                    const ext =
                      fileName.split(".").pop()?.toUpperCase() || "FILE";
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString(
                      i18n.language === "pl" ? "pl-PL" : "en-US",
                      { day: "2-digit", month: "2-digit", year: "numeric" },
                    );
                    return `${t("documents.added")} ${formattedDate} · ${ext}`;
                  })()}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing.sm }} />
        )}
      />
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    h2: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    top: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    deleteLink: { color: theme.colors.danger, fontWeight: "800" },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm / 2,
    },
    detailsTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
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
    bodyValue: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.fg,
      lineHeight: theme.typography.body + 4,
    },
    sectionHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    list: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.lg,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    muted: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm / 2,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    cardMeta: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
  });
