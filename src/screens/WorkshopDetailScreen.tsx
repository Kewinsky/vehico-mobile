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
      toastSuccess(t("workshopDetail.copiedPhone"));
    }
  }

  async function onCopyAddress() {
    const address = workshop?.address?.trim();
    if (address) {
      await Clipboard.setStringAsync(address);
      toastSuccess(t("workshopDetail.copiedAddress"));
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

  function showActionsMenu() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];
    if (workshop.phone_number?.trim()) {
      buttons.push({ text: t("workshops.call"), onPress: onCall });
    }
    buttons.push({
      text: t("common.edit"),
      onPress: () => navigation.navigate("WorkshopForm", { workshopId }),
    });
    buttons.push({
      text: t("common.delete"),
      style: "destructive",
      onPress: onDelete,
    });
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert("", "", buttons);
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
          <Text
            style={[styles.screenTitle, { color: theme.colors.fg }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {workshop.name || t("workshopDetail.title")}
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

        <View
          style={[
            styles.detailsCard,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Ionicons
                name="business-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("workshopForm.name")}
              </Text>
            </View>
            <Text
              style={[styles.value, { color: theme.colors.fg }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {workshop.name}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Ionicons
                name="construct-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("workshopForm.workshopType")}
              </Text>
            </View>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {getWorkshopTypeLabel(workshop.workshop_type)}
            </Text>
          </View>
          {workshop.phone_number ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("workshopDetail.phone")}
                </Text>
              </View>
              <Pressable
                onPress={onCopyPhone}
                style={({ pressed }) => [
                  styles.phoneRow,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text
                  style={[styles.value, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  <Ionicons
                    name="copy-outline"
                    size={18}
                    color={theme.colors.fg}
                  />{" "}
                  {workshop.phone_number}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {workshop.address ? (
            <View style={styles.rowAddress}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("workshopDetail.address")}
                </Text>
              </View>
              <Pressable
                onPress={onCopyAddress}
                style={({ pressed }) => [
                  styles.addressRow,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.value,
                    styles.valueWrap,
                    { color: theme.colors.fg },
                  ]}
                >
                  <Ionicons
                    name="copy-outline"
                    size={18}
                    color={theme.colors.fg}
                  />{" "}
                  {workshop.address}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("workshops.serviceEntriesAtWorkshopWithCount", {
            count: serviceEntries.length,
          })}
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    screenTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    menuButton: {
      padding: theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
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
    rowAddress: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    phoneRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
    },
    addressRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "flex-end",
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: "400",
      textAlign: "right",
    },
    valueWrap: {
      textAlign: "right",
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
