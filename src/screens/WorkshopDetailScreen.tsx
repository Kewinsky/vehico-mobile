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
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { ServiceEntry } from "../types/domain";
import {
  getWorkshop,
  deleteWorkshop,
  listServiceEntriesByWorkshop,
} from "../services/workshops/workshopsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { formatDateDisplay } from "../utils/dateFormatting";
import { i18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopDetail">;

export function WorkshopDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { workshopId } = route.params;
  const currency = settings?.currency ?? "PLN";

  const [workshop, setWorkshop] = useState<any>(null);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      try {
        if (opts?.refreshing) setRefreshing(true);
        else setLoading(true);
        const [w, entries] = await Promise.all([
          getWorkshop(workshopId),
          listServiceEntriesByWorkshop(workshopId),
        ]);
        setWorkshop(w);
        setServiceEntries(entries);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.refreshing) setRefreshing(false);
        else setLoading(false);
      }
    },
    [workshopId, t]
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  function getWorkshopTypeLabel(type: string): string {
    return t(`workshopForm.types.${type}`);
  }

  function onCall() {
    const phone = workshop?.phone_number?.trim();
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  }

  async function onCopyPhone() {
    const phone = workshop?.phone_number?.trim();
    if (phone) {
      await Clipboard.setStringAsync(phone);
      toastSuccess(t("common.copied"));
    }
  }

  function onDelete() {
    Alert.alert(t("workshops.deleteTitle"), t("workshops.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkshop(workshopId);
            navigation.goBack();
          } catch (e: any) {
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
  }

  if (loading && !workshop) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  if (!workshop) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  const renderHeader = () => (
    <>
      <View style={[styles.top, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.colors.fg }]}>
            {t("workshopDetail.title")}
          </Text>
          <View style={styles.actionsRow}>
            {workshop.phone_number ? (
              <Pressable onPress={onCall} hitSlop={10}>
                <Text style={[styles.callLink, { color: theme.colors.accent }]}>
                  {t("workshops.call")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                navigation.navigate("WorkshopForm", { workshopId })
              }
              hitSlop={10}
            >
              <Text style={[styles.editLink, { color: theme.colors.accent }]}>
                {t("common.edit")}
              </Text>
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={10}>
              <Text style={[styles.deleteLink, { color: theme.colors.danger }]}>
                {t("common.delete")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.detailsCard,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text style={[styles.detailsTitle, { color: theme.colors.fg }]}>
            {workshop.name}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("workshopForm.workshopType")}
            </Text>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {getWorkshopTypeLabel(workshop.workshop_type)}
            </Text>
          </View>
          {workshop.phone_number ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("workshopDetail.phone")}
              </Text>
              <Pressable
                onPress={onCopyPhone}
                style={({ pressed }) => [
                  styles.phoneRow,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.value, { color: theme.colors.accent }]}>
                  {workshop.phone_number}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={theme.colors.accent}
                />
              </Pressable>
            </View>
          ) : null}
          {workshop.address ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("workshopDetail.address")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {workshop.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("workshops.serviceEntriesAtWorkshop")}
        </Text>
      </View>
    </>
  );

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <FlatList
        data={serviceEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
            {t("workshops.noServiceEntries")}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("ServiceEntryDetail", {
                vehicleId: item.vehicle_id,
                entryId: item.id,
              })
            }
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
              <View style={styles.cardRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.cardTitle, { color: theme.colors.fg }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.cardMeta, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {formatDateDisplay(item.service_date, i18n.language)}
                    {item.cost != null ? ` · ${item.cost} ${currency}` : ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.muted}
                />
              </View>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing.sm }} />
        )}
      />
    </Screen>
  );
}

function makeStyles(theme: any, insets: { bottom: number }) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
    top: {
      paddingTop: theme.spacing.md,
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
    screenTitle: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    editLink: { fontWeight: "800" },
    deleteLink: { fontWeight: "800" },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm / 2,
    },
    detailsTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    callLink: { fontWeight: "800" },
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    value: {
      fontSize: theme.typography.small,
      fontWeight: "400",
    },
    sectionHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    list: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: insets.bottom + theme.spacing.lg,
    },
    emptyText: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    cardMeta: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs / 2,
    },
  });
}
