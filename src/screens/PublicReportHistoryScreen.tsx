import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { PublicReportSnapshot } from "../types/domain";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import {
  listPublicPages,
  deletePublicPage,
  getPublicPageUrl,
  updatePublicReportTitle,
} from "../services/publicPages/publicPagesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { IconButton } from "../ui/components/IconButton";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { formatDate } from "../utils/dateFormatting";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportHistory">;

export function PublicReportHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reports, setReports] = useState<PublicReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVehicle = useCallback(async () => {
    try {
      const v = await getVehicle(vehicleId);
      setVehicle(v);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const loaded = await listPublicPages(vehicleId);
      setReports(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const loaded = await listPublicPages(vehicleId);
      setReports(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setRefreshing(false);
    }
  }

  function handleEditTitle(report: PublicReportSnapshot) {
    Alert.prompt(
      t("publicReport.editTitleTitle"),
      t("publicReport.editTitleBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (newTitle: string | undefined) => {
            try {
              await updatePublicReportTitle(report.id, newTitle?.trim() || null);
              toastSuccess(t("publicReport.titleUpdated"));
              await loadReports();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      report.title || ""
    );
  }

  function handleDeleteReport(report: PublicReportSnapshot) {
    Alert.alert(
      t("share.deleteReportTitle"),
      t("share.deleteReportBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deletePublicPage(report.id);
              toastSuccess(t("share.reportDeleted"));
              await loadReports();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ]
    );
  }

  async function handleReportPress(report: PublicReportSnapshot) {
    try {
      const url = await getPublicPageUrl(report.public_id);
      navigation.navigate("PublicReportOptions", {
        url,
        vehicleTitle,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <Text style={styles.h1}>{t("share.historyTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("share.historySubtitle", { vehicleTitle })}
        </Text>

        <View style={{ height: theme.spacing.md }} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : reports.length === 0 ? (
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
            {t("share.noReports")}
          </Text>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleReportPress(item)}
                style={({ pressed }) => [
                  styles.reportCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => handleReportPress(item)}
                  >
                    <Text style={[styles.reportTitle, { color: theme.colors.fg }]}>
                      {item.title || t("publicReport.defaultTitle")}
                    </Text>
                    <Text style={[styles.reportDate, { color: theme.colors.muted }]}>
                      {t("share.generatedOn")} {formatDate(item.created_at)}
                    </Text>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                    <IconButton
                      onPress={() => handleEditTitle(item)}
                      variant="ghost"
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </IconButton>
                    <IconButton
                      onPress={() => handleDeleteReport(item)}
                      variant="danger"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.colors.danger}
                      />
                    </IconButton>
                  </View>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
          />
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      color: theme.colors.muted,
      lineHeight: 22,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    list: {
      paddingBottom: theme.spacing.md,
    },
    reportCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    reportTitle: {
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 4,
    },
    reportDate: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
