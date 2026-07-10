import { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Animated, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SquarePen, Trash2 } from "lucide-react-native";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../../ui/components/common/SwipeActions";

import { routes } from "../../core/navigation/routes";
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
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { i18n } from "../../i18n/i18n";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";

export function PublicReportHistoryScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reports, setReports] = useState<PublicReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return;
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

  const loadReports = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const loaded = await listPublicPages(vehicleId);
      setReports(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleRefresh() {
    if (!vehicleId) return;
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
            toastError(e?.message ?? t("common.error"));
          }
        },
      },
    ]);
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
    if (!vehicleId) return;
    try {
      const url = await getPublicPageUrl(report.public_id);
      router.push(
        routes.publicReportOptions(vehicleId, {
          url,
          vehicleTitle,
          reportTitle: report.title,
          generatedAt: `${t("share.generatedOn")} ${formatShortDisplayDate(report.created_at, i18n.language)}`,
        }),
      );
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function renderRightActions(
    item: PublicReportSnapshot,
    progress: Animated.AnimatedInterpolation<number>,
  ) {
    return (
      <SwipeActionsRow
        progress={progress}
        actions={[
          {
            onPress: () => handleEditTitle(item),
            color: theme.colors.accent,
            icon: <SquarePen size={22} color="#000000" />,
          },
          {
            onPress: () => confirmDeleteReport(item),
            color: theme.colors.danger,
            icon: <Trash2 size={22} color="#000000" />,
          },
        ]}
      />
    );
  }

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => router.back()}
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
            <ExclusiveSwipeable
              renderRightActions={(progress) =>
                renderRightActions(item, progress)
              }
              rightThreshold={32}
            >
              <ListRowWithActions
                title={item.title || t("publicReport.defaultTitle")}
                subtitle={`${t("share.generatedOn")} ${formatShortDisplayDate(item.created_at, i18n.language)}`}
                onPress={() => handleReportPress(item)}
              />
            </ExclusiveSwipeable>
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
      borderRadius: theme.radius.xl,
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
