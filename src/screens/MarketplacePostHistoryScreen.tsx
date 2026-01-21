import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { MarketplacePost } from "../types/domain";
import {
  listMarketplacePosts,
  deleteMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

import { formatDate } from "../utils/dateFormatting";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplacePostHistory">;

export function MarketplacePostHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const loaded = await listMarketplacePosts(vehicleId);
      setPosts(loaded);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
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
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCopyPost(post: MarketplacePost) {
    try {
      await Clipboard.setStringAsync(post.content);
      toastSuccess(t("marketplace.copiedToClipboard"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  async function handleDeletePost(post: MarketplacePost) {
    Alert.alert(
      t("marketplace.deletePostTitle"),
      t("marketplace.deletePostBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketplacePost(post.id);
              toastSuccess(t("marketplace.deleted"));
              await loadPosts();
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  async function handleEditPost(post: MarketplacePost) {
    navigation.navigate("MarketplacePostEdit", {
      postId: post.id,
    });
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <Text style={styles.h1}>{t("marketplace.historyTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("marketplace.historySubtitle", { vehicleTitle: route.params.title })}
        </Text>

        <View style={{ height: theme.spacing.md }} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : posts.length === 0 ? (
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
            {t("marketplace.noSavedPosts")}
          </Text>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.postCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleEditPost(item)}
              >
                <View style={styles.postHeader}>
                  <Text style={[styles.postDate, { color: theme.colors.muted }]}>
                    {t("marketplace.generatedOn")} {formatDate(item.created_at)}
                  </Text>
                  <View style={styles.postActions}>
                    <Pressable
                      onPress={() => handleCopyPost(item)}
                      style={styles.postActionButton}
                    >
                      <Text
                        style={[styles.postActionText, { color: theme.colors.accent }]}
                      >
                        {t("marketplace.copyToClipboard")}
                      </Text>
                    </Pressable>
                    <View style={{ width: theme.spacing.xs }} />
                    <Pressable
                      onPress={() => handleDeletePost(item)}
                      style={styles.postActionButton}
                    >
                      <Text
                        style={[styles.postActionText, { color: theme.colors.danger }]}
                      >
                        {t("common.delete")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Text
                  style={[styles.postPreview, { color: theme.colors.fg }]}
                  numberOfLines={3}
                >
                  {item.content}
                </Text>
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
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      marginTop: 8,
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
    postCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    postHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    postDate: {
      fontSize: 12,
    },
    postActions: {
      flexDirection: "row",
    },
    postActionButton: {
      paddingHorizontal: theme.spacing.xs,
    },
    postActionText: {
      fontSize: 12,
      fontWeight: "600",
    },
    postPreview: {
      fontSize: 13,
      lineHeight: 18,
    },
  });
