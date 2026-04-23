import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

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
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { formatDateDisplay } from "../../utils/dateFormatting";
import { i18n } from "../../i18n/i18n";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";

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

  function renderRightActions(item: PublicReportSnapshot) {
    return (
      <View style={styles.swipeActionsWrap}>
        <Pressable
          onPress={() => handleEditTitle(item)}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.accent }]}
        >
          <Pencil size={22} color="#000000" />
        </Pressable>
      </View>
    );
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
            <Swipeable
              renderRightActions={() => renderRightActions(item)}
              rightThreshold={32}
            >
              <ListRowWithActions
                title={item.title || t("publicReport.defaultTitle")}
                subtitle={`${t("share.generatedOn")} ${formatDateDisplay(item.created_at, i18n.language)}`}
                onPress={() => handleReportPress(item)}
              />
            </Swipeable>
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
    swipeActionsWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginLeft: theme.spacing.xs,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    swipeActionBtn: {
      width: 72,
      alignItems: "center",
      justifyContent: "center",
    },
  });
