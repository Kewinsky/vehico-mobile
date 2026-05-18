import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SquarePen } from "lucide-react-native";
import { ExclusiveSwipeable } from "../../ui/components/common/ExclusiveSwipeable";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { MarketplacePost } from "../../types/domain";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../../types/domain";
import {
  listMarketplacePosts,
  updateMarketplacePostTitle,
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

type Props = NativeStackScreenProps<
  AppStackParamList,
  "MarketplacePostHistory"
>;

export function MarketplacePostHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
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
    void loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const loaded = await listMarketplacePosts(vehicleId);
      setPosts(loaded);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
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
    navigation.navigate("MarketplacePostOptions", {
      content: post.content,
      vehicleTitle,
      vehicleId,
      postTitle: post.title,
      generatedAt: `${t("marketplace.generatedOn")} ${formatShortDisplayDate(post.created_at, i18n.language)}`,
    });
  }

  function renderRightActions(item: MarketplacePost) {
    return (
      <View style={styles.swipeActionsWrap}>
        <Pressable
          onPress={() => handleEditTitle(item)}
          style={[styles.swipeActionBtn, { backgroundColor: theme.colors.accent }]}
        >
          <SquarePen size={22} color="#000000" />
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
              renderRightActions={() => renderRightActions(item)}
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
      borderRadius: theme.radius.md,
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
