import { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Animated, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SquarePen, Trash2 } from "lucide-react-native";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../../ui/components/common/SwipeActions";

import { routes } from "../../core/navigation/routes";
import type { MarketplacePost, Vehicle } from "../../types/domain";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import {
  listMarketplacePosts,
  updateMarketplacePostTitle,
  deleteMarketplacePost,
} from "../../services/marketplace/marketplaceRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { ListRowWithActions } from "../../ui/components/list/ListRowWithActions";
import { toastError, toastSuccess } from "../../ui/toast/toast";

import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { i18n } from "../../i18n/i18n";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";

export function MarketplacePostHistoryScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
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

  const loadPosts = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const loaded = await listMarketplacePosts(vehicleId);
      setPosts(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function handleRefresh() {
    if (!vehicleId) return;
    try {
      setRefreshing(true);
      const loaded = await listMarketplacePosts(vehicleId);
      setPosts(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setRefreshing(false);
    }
  }

  function confirmDeletePost(post: MarketplacePost) {
    Alert.alert(
      t("marketplace.deletePostTitle"),
      t("marketplace.deletePostBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketplacePost(post.id);
              setPosts((prev) => prev.filter((p) => p.id !== post.id));
              toastSuccess(t("marketplace.deleted"));
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }

  function handleEditTitle(post: MarketplacePost) {
    Alert.prompt(
      t("marketplace.editTitleTitle"),
      t("marketplace.editTitleBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (newTitle: string | undefined) => {
            try {
              await updateMarketplacePostTitle(
                post.id,
                newTitle?.trim() || null,
              );
              toastSuccess(t("marketplace.titleUpdated"));
              await loadPosts();
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      post.title || "",
    );
  }

  function handlePostPress(post: MarketplacePost) {
    if (!vehicleId) return;
    router.push(
      routes.marketplacePostOptions(vehicleId, {
        content: JSON.stringify(post.content),
        vehicleTitle,
        postTitle: post.title,
        generatedAt: `${t("marketplace.generatedOn")} ${formatShortDisplayDate(post.created_at, i18n.language)}`,
      }),
    );
  }

  function renderRightActions(
    item: MarketplacePost,
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
            onPress: () => confirmDeletePost(item),
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
          data={posts}
          listHeaderComponent={
            <ContentHeader title={t("marketplace.historyTitle")} />
          }
          keyExtractor={(item: MarketplacePost) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState body={t("marketplace.noSavedPosts")} />
          }
          renderItem={({ item }) => (
            <ExclusiveSwipeable
              renderRightActions={(progress) =>
                renderRightActions(item, progress)
              }
              rightThreshold={32}
            >
              <ListRowWithActions
                title={item.title || t("marketplace.defaultTitle")}
                subtitle={`${t("marketplace.generatedOn")} ${formatShortDisplayDate(item.created_at, i18n.language)}`}
                onPress={() => handlePostPress(item)}
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
    listContent: {
      paddingBottom: theme.spacing.md,
    },
    postCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    postTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
    },
    postDate: {
      fontSize: theme.typography.small,
    },
  });
