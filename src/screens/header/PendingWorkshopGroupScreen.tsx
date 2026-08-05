import { useCallback, useMemo, useState } from "react";
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
import { Phone } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { ServiceEntry, ServiceEntryCategory } from "../../types/domain";
import {
  approveWorkshopServiceEntry,
  listPendingWorkshopEntries,
  rejectWorkshopServiceEntry,
} from "../../services/workshopIntake/workshopIntakeRepo";
import { workshopGroupKey } from "../../services/workshopIntake/pendingWorkshopGroups";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Card } from "../../ui/components/common/Card";
import { Button } from "../../ui/components/common/Button";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { ServiceCategoryIcon } from "../../ui/components/service/ServiceCategoryIcon";
import { SERVICE_CATEGORY_ICON_BACKGROUND } from "../../ui/theme/serviceCategoryColors";
import { useTheme } from "../../ui/ThemeProvider";
import type { AppTheme } from "../../ui/theme";
import { toastCaughtError, toastSuccess } from "../../ui/toast/toast";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { groupThousands } from "../../utils/numberFormatting";

type Props = NativeStackScreenProps<AppStackParamList, "PendingWorkshopGroup">;

export function PendingWorkshopGroupScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = useUserSettings();
  const { distanceUnitLabel } = useUnitDisplay();
  const { vehicleId, workshopKey, workshopName } = route.params;
  const currency = settings?.currency ?? "PLN";

  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) setLoading(true);
        const data = await listPendingWorkshopEntries(vehicleId);
        const filtered = data.filter(
          (entry) =>
            workshopGroupKey(entry.submitted_workshop_name) === workshopKey,
        );
        setItems(filtered);
        setSelectedIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (filtered.some((entry) => entry.id === id)) next.add(id);
          }
          return next;
        });
        if (filtered.length === 0 && opts?.showLoading === false) {
          navigation.goBack();
        }
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        if (opts?.showLoading !== false) setLoading(false);
      }
    },
    [vehicleId, workshopKey, t, navigation],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
  });

  const toggleSelected = useCallback((entryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;
  const canAct = selectedCount > 0 && !busy;
  const workshopPhone =
    items
      .map((entry) => entry.submitted_workshop_phone?.trim())
      .find((phone) => Boolean(phone)) ?? null;

  const handleCallWorkshop = useCallback((phone: string) => {
    const telHref = `tel:${phone.replace(/[^\d+#*;,.]/g, "")}`;
    void Linking.openURL(telHref);
  }, []);

  const removeProcessed = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      setItems((prev) => {
        const next = prev.filter((item) => !idSet.has(item.id));
        if (next.length === 0) {
          queueMicrotask(() => navigation.goBack());
        }
        return next;
      });
    },
    [navigation],
  );

  const handleApproveSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBusy(true);
    try {
      for (const id of ids) {
        await approveWorkshopServiceEntry(id);
      }
      removeProcessed(ids);
      toastSuccess(
        ids.length === 1
          ? t("pendingWorkshop.approved")
          : t("pendingWorkshop.approvedMany", { count: ids.length }),
      );
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
      await load({ showLoading: false });
    } finally {
      setBusy(false);
    }
  }, [selectedIds, removeProcessed, t, load]);

  const handleRejectSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    Alert.alert(
      t("pendingWorkshop.rejectTitle"),
      ids.length === 1
        ? t("pendingWorkshop.rejectConfirm")
        : t("pendingWorkshop.rejectConfirmMany", { count: ids.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("pendingWorkshop.reject"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              for (const id of ids) {
                await rejectWorkshopServiceEntry(id);
              }
              removeProcessed(ids);
              toastSuccess(
                ids.length === 1
                  ? t("pendingWorkshop.rejected")
                  : t("pendingWorkshop.rejectedMany", { count: ids.length }),
              );
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
              await load({ showLoading: false });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, removeProcessed, t, load]);

  const footer = (
    <View style={styles.footer}>
      <Button
        onPress={() => void handleApproveSelected()}
        disabled={!canAct}
        loading={busy}
        style={styles.actionButton}
      >
        {t("pendingWorkshop.approve")}
      </Button>
      <Button
        onPress={handleRejectSelected}
        disabled={!canAct}
        variant="outlined"
        color={theme.colors.danger}
        style={styles.actionButton}
      >
        {t("pendingWorkshop.reject")}
      </Button>
    </View>
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      footer={!loading && items.length > 0 ? footer : undefined}
    >
      <NativeHeaderScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <ContentHeader
          title={workshopName}
          subtitle={t("pendingWorkshop.groupSubtitle")}
        />

        {workshopPhone ? (
          <Pressable
            onPress={() => handleCallWorkshop(workshopPhone)}
            accessibilityRole="button"
            style={styles.phoneRow}
          >
            <Phone size={16} color={theme.colors.accent} />
            <Text style={styles.phoneText}>{workshopPhone}</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <LoadingIndicator />
        ) : items.length === 0 ? (
          <EmptyState body={t("pendingWorkshop.empty")} />
        ) : (
          <View style={styles.list}>
            {items.map((entry) => {
              const cat = (entry.category ?? "other") as ServiceEntryCategory;
              const selected = selectedIds.has(entry.id);
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => toggleSelected(entry.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <Card
                    withoutDividers
                    style={[
                      styles.card,
                      {
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.topRow}>
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor:
                              SERVICE_CATEGORY_ICON_BACKGROUND[cat],
                          },
                        ]}
                      >
                        <ServiceCategoryIcon category={cat} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={styles.title} numberOfLines={2}>
                          {entry.title}
                        </Text>
                        <Text style={styles.meta}>
                          {formatShortDisplayDate(
                            entry.service_date,
                            i18n.language,
                          )}
                          {entry.mileage != null
                            ? ` · ${groupThousands(
                                entry.mileage,
                                0,
                                i18n.language,
                              )} ${distanceUnitLabel}`
                            : ""}
                          {entry.cost != null
                            ? ` · ${groupThousands(
                                entry.cost,
                                0,
                                i18n.language,
                              )} ${currency}`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    {entry.description?.trim() ? (
                      <Text style={styles.description}>
                        {entry.description}
                      </Text>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    phoneText: {
      fontSize: theme.typography.body,
      color: theme.colors.accent,
      fontWeight: theme.typography.fontWeight.bold,
    },
    list: {
      gap: theme.spacing.md,
    },
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderWidth: 1,
    },
    topRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    meta: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
    description: {
      fontSize: theme.typography.small,
      color: theme.colors.fg,
      lineHeight: theme.typography.small + 4,
    },
    footer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
