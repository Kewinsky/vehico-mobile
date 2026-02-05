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
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Attachment } from "../types/domain";
import { listAttachments } from "../services/attachments/attachmentsRepo";
import {
  getAttachmentOpenUrl,
  getFileNameFromItem,
} from "../services/storage/openFileUrl";
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
    [entryId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  function openAttachment(att: Attachment) {
    try {
      const url = getAttachmentOpenUrl(att);
      void Linking.openURL(url);
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

  function showActionsMenu() {
    Alert.alert("", "", [
      {
        text: t("common.edit"),
        onPress: () =>
          navigation.navigate("ServiceEntryForm", { vehicleId, entryId }),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: onDelete,
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {entry?.title || t("entryDetail.title")}
          </Text>
          <Pressable
            onPress={showActionsMenu}
            hitSlop={10}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.colors.fg}
            />
          </Pressable>
        </View>

        {entry ? (
          <View style={styles.detailsCard}>
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={styles.label}>{t("entryForm.entryTitle")}</Text>
              </View>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                {entry.title}
              </Text>
            </View>
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={styles.label}>
                  {t("entryDetail.labels.serviceDate")}
                </Text>
              </View>
              <Text style={styles.value}>
                {String(entry.service_date).slice(0, 10)}
              </Text>
            </View>
            {entry.category ? (
              <View style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    {t("entryDetail.labels.category")}
                  </Text>
                </View>
                <Text style={styles.value}>
                  {t(`entryForm.categories.${entry.category}` as any)}
                </Text>
              </View>
            ) : null}
            {entry.mileage != null ? (
              <View style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    {t("entryDetail.labels.mileage")}
                  </Text>
                </View>
                <Text style={styles.value}>
                  {entry.mileage} {distanceUnit}
                </Text>
              </View>
            ) : null}
            {entry.cost != null ? (
              <View style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    {t("entryDetail.labels.cost")}
                  </Text>
                </View>
                <Text style={styles.value}>
                  {entry.cost} {currency}
                </Text>
              </View>
            ) : null}
            {entry.description ? (
              <>
                <View style={{ height: theme.spacing.sm }} />
                <View style={styles.labelRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <Text style={styles.label}>
                    {t("entryDetail.labels.description")}
                  </Text>
                </View>
                <Text style={styles.bodyValue}>
                  {String(entry.description)}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.h2}>
          {t("attachments.titleWithCount", { count: items.length })}
        </Text>
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
                    const fileName = getFileNameFromItem(item);
                    const ext =
                      fileName.split(".").pop()?.toUpperCase() || "FILE";
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString(
                      i18n.language === "pl" ? "pl-PL" : "en-US",
                      { day: "2-digit", month: "2-digit", year: "numeric" }
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
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    menuButton: {
      padding: theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 0,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: "400",
      color: theme.colors.fg,
      textAlign: "right",
    },
    bodyValue: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.fg,
      lineHeight: theme.typography.body + 4,
    },
    sectionHeader: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    list: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
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
