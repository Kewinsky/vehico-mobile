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
import { Feather } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { PublicReportSnapshot } from "../../types/domain";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../../types/domain";
import {
  listPublicPages,
  getPublicPageUrl,
  updatePublicReportTitle,
} from "../../services/publicPages/publicPagesRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/ContentHeader";
import { EmptyState } from "../../ui/components/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { IconButton } from "../../ui/components/IconButton";
import { ListRowWithActions } from "../../ui/components/ListRowWithActions";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { formatDateDisplay } from "../../utils/dateFormatting";
import { i18n } from "../../i18n/i18n";
import { CustomFlatList } from "../../ui/components/CustomFlatList";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportHistory">;

export function PublicReportHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
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
              await updatePublicReportTitle(
                report.id,
                newTitle?.trim() || null,
              );
              toastSuccess(t("publicReport.titleUpdated"));
              await loadReports();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      report.title || "",
    );
  }

  async function handleReportPress(report: PublicReportSnapshot) {
    try {
      const url = await getPublicPageUrl(report.public_id);
      navigation.navigate("PublicReportOptions", {
        url,
        vehicleTitle,
        vehicleId,
        reportTitle: report.title,
        generatedAt: `${t("share.generatedOn")} ${formatDateDisplay(report.created_at, i18n.language)}`,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          data={reports}
          listHeaderComponent={
            <ContentHeader title={t("share.historyTitle")} />
          }
          keyExtractor={(item: PublicReportSnapshot) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={<EmptyState body={t("share.noReports")} />}
          renderItem={({ item }) => (
            <ListRowWithActions
              title={item.title || t("publicReport.defaultTitle")}
              subtitle={`${t("share.generatedOn")} ${formatDateDisplay(item.created_at, i18n.language)}`}
              onPress={() => handleReportPress(item)}
              trailing={
                <IconButton
                  onPress={() => handleEditTitle(item)}
                  variant="ghost"
                >
                  <Feather name="edit" size={24} color={theme.colors.accent} />
                </IconButton>
              }
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
        />
      </View>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    listWrap: { flex: 1 },
    list: { flex: 1 },
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
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
    },
    reportDate: {
      fontSize: theme.typography.small,
    },
  });
