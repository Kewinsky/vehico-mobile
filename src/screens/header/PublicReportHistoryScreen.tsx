import { useEffect, useMemo, useState, useCallback } from "react";
import { Platform, Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SquarePen, Trash2 } from "lucide-react-native";
import { SwipeableListRow } from "../../ui/components/list/SwipeableListRow";
import type { ListRowAction } from "../../ui/components/list/SwipeableListRow.types";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { PublicReportSnapshot, Vehicle } from "../../types/domain";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import {
  listPublicPages,
  getPublicPageUrl,
  updatePublicReportTitle,
  deletePublicReport,
} from "../../services/publicPages/publicPagesRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { toastCaughtError, toastSuccess } from "../../ui/toast/toast";
import { promptAlert } from "../../ui/prompt/promptAlert";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
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
      toastCaughtError(e, t("common.error"));
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await listPublicPages(vehicleId);
      setReports(loaded);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const loaded = await listPublicPages(vehicleId);
      setReports(loaded);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setRefreshing(false);
    }
  }

  function confirmDeleteReport(report: PublicReportSnapshot) {
    Alert.alert(t("share.deleteReportTitle"), t("share.deleteReportBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await deletePublicReport(report.id);
            setReports((prev) => prev.filter((r) => r.id !== report.id));
            toastSuccess(t("share.reportDeleted"));
          } catch (e: any) {
            toastCaughtError(e, t("common.error"));
          }
        },
      },
    ]);
  }

  function handleEditTitle(report: PublicReportSnapshot) {
    promptAlert(
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
              toastCaughtError(e, t("common.error"));
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
        generatedAt: `${t("share.generatedOn")} ${formatShortDisplayDate(report.created_at, i18n.language)}`,
      });
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  function getActions(item: PublicReportSnapshot): ListRowAction[] {
    return [
      {
        onPress: () => confirmDeleteReport(item),
        systemImage: "trash",
        accessibilityLabel: t("common.delete"),
        color: theme.colors.danger,
        icon: <Trash2 size={22} color="#000000" />,
      },
      {
        onPress: () => handleEditTitle(item),
        systemImage: "square.and.pencil",
        accessibilityLabel: t("common.edit"),
        color: theme.colors.accent,
        icon: <SquarePen size={22} color="#000000" />,
      },
    ];
  }

  return (
    <HeaderLayout
      title={t("share.historyTitle")}
      largeTitle={Platform.OS === "ios"}
      loading={loading}
      onBack={() => navigation.goBack()}
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          nativeRows
          data={reports}
          listHeaderComponent={Platform.OS === "ios" ? null : (
            <ContentHeader title={t("share.historyTitle")} />
          )}
          keyExtractor={(item: PublicReportSnapshot) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={<EmptyState body={t("share.noReports")} />}
          renderItem={({ item }) => (
            <SwipeableListRow actions={getActions(item)}>
              <ListRowWithActions
                title={item.title || t("publicReport.defaultTitle")}
                subtitle={`${t("share.generatedOn")} ${formatShortDisplayDate(item.created_at, i18n.language)}`}
                onPress={() => handleReportPress(item)}
              />
            </SwipeableListRow>
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
