import { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { ServiceEntry } from "../../types/domain";
import { listPendingWorkshopEntries } from "../../services/workshopIntake/workshopIntakeRepo";
import {
  groupPendingByWorkshop,
  latestSubmittedAt,
  type PendingWorkshopGroup,
} from "../../services/workshopIntake/pendingWorkshopGroups";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { Card } from "../../ui/components/common/Card";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import type { AppTheme } from "../../ui/theme";
import { toastCaughtError } from "../../ui/toast/toast";
import { formatShortDisplayDate } from "../../utils/dateFormatting";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "PendingWorkshopEntries"
>;

export function PendingWorkshopEntriesScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const groups = useMemo(() => groupPendingByWorkshop(items), [items]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) setLoading(true);
        const data = await listPendingWorkshopEntries(vehicleId);
        setItems(data);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        if (opts?.showLoading !== false) setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
  });

  const handleOpenGroup = useCallback(
    (group: PendingWorkshopGroup) => {
      navigation.navigate("PendingWorkshopGroup", {
        vehicleId,
        workshopKey: group.key,
        workshopName: group.name,
      });
    },
    [navigation, vehicleId],
  );

  return (
    <HeaderLayout
      title={t("pendingWorkshop.title")}
      largeTitle={Platform.OS === "ios"}
      loading={loading}
      onBack={() => navigation.goBack()}
    >
      <CustomFlatList
        data={groups}
        keyExtractor={(group) => group.key}
        listHeaderComponent={
          Platform.OS === "ios" ? (
            <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing.md }}>
              {t("pendingWorkshop.subtitle")}
            </Text>
          ) : (
            <ContentHeader
              title={t("pendingWorkshop.title")}
              subtitle={t("pendingWorkshop.subtitle")}
            />
          )
        }
        ListEmptyComponent={<EmptyState body={t("pendingWorkshop.empty")} />}
        renderItem={({ item: group }) => {
          const submittedAt = latestSubmittedAt(group.entries);
          return (
            <Pressable
              onPress={() => handleOpenGroup(group)}
              accessibilityRole="button"
            >
              <Card withoutDividers style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.textBlock}>
                    <Text style={styles.name} numberOfLines={2}>
                      {group.name}
                    </Text>
                    <Text style={styles.meta}>
                      {t("pendingWorkshop.submittedAt", {
                        date: formatShortDisplayDate(
                          submittedAt,
                          i18n.language,
                        ),
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </HeaderLayout>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.md,
    },
    card: {
      padding: theme.spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 2,
    },
    name: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    meta: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
  });
