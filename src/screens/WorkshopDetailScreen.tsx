import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

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
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { formatDate } from "../utils/dateFormatting";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopDetail">;

export function WorkshopDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { workshopId } = route.params;

  const [workshop, setWorkshop] = useState<any>(null);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [w, entries] = await Promise.all([
        getWorkshop(workshopId),
        listServiceEntriesByWorkshop(workshopId),
      ]);
      setWorkshop(w);
      setServiceEntries(entries);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [workshopId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function getWorkshopTypeLabel(type: string): string {
    return t(`workshopForm.types.${type}`);
  }

  function onCall() {
    if (workshop?.phone?.trim()) {
      Linking.openURL(`tel:${workshop.phone.trim()}`);
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

  if (loading || !workshop) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <LoadingIndicator />
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() =>
                navigation.navigate("WorkshopForm", { workshopId })
              }
              hitSlop={10}
            >
              <Text style={[styles.editLink, { color: theme.colors.accent }]}>
                {t("workshopDetail.edit")}
              </Text>
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={10}>
              <Text style={[styles.deleteLink, { color: theme.colors.danger }]}>
                {t("workshopDetail.delete")}
              </Text>
            </Pressable>
          </View>
        }
      />
      <View style={[styles.content, { paddingHorizontal: theme.spacing.md }]}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {workshop.name}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {getWorkshopTypeLabel(workshop.workshop_type)}
        </Text>

        {workshop.phone ? (
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.phoneRow,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("workshopDetail.phone")}
            </Text>
            <Text style={[styles.phoneValue, { color: theme.colors.accent }]}>
              {t("workshops.call")}: {workshop.phone}
            </Text>
          </Pressable>
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

        <View style={{ height: theme.spacing.lg }} />
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("workshops.serviceEntriesAtWorkshop")}
        </Text>
        {serviceEntries.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>
            {t("workshops.noServiceEntries")}
          </Text>
        ) : (
          <View style={styles.entriesList}>
            {serviceEntries.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() =>
                  navigation.navigate("ServiceEntryDetail", {
                    vehicleId: entry.vehicle_id,
                    entryId: entry.id,
                  })
                }
                style={({ pressed }) => [
                  styles.entryCard,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={[styles.entryTitle, { color: theme.colors.fg }]}>
                  {entry.title}
                </Text>
                <Text style={[styles.entryDate, { color: theme.colors.muted }]}>
                  {formatDate(entry.service_date)}
                  {entry.cost != null ? ` • ${entry.cost} PLN` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    editLink: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
    deleteLink: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
    content: {
      flex: 1,
      paddingTop: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
    row: {
      marginTop: theme.spacing.md,
    },
    phoneRow: {
      marginTop: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.xs,
      fontWeight: "600",
      marginBottom: theme.spacing.xs,
    },
    value: {
      fontSize: theme.typography.small,
    },
    phoneValue: {
      fontSize: 14,
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    entriesList: {
      gap: theme.spacing.sm,
    },
    entryCard: {
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    entryTitle: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    entryDate: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
  });
}
