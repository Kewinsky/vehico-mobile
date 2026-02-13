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

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { MarketplacePost } from "../types/domain";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import {
  listMarketplacePosts,
  updateMarketplacePostTitle,
} from "../services/marketplace/marketplaceRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { IconButton } from "../ui/components/IconButton";
import { toastError, toastSuccess } from "../ui/toast/toast";

import { formatDateDisplay } from "../utils/dateFormatting";
import { i18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "MarketplacePostHistory"
>;

export function MarketplacePostHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
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
    });
  }

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <ScreenLayout
        title={t("marketplace.historyTitle")}
        scrollable={false}
        contentContainerStyle={styles.wrap}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : posts.length === 0 ? (
          <Text
            style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}
          >
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
                onPress={() => handlePostPress(item)}
                style={({ pressed }) => [
                  styles.postCard,
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
                    onPress={() => handlePostPress(item)}
                  >
                    <Text
                      style={[styles.postTitle, { color: theme.colors.fg }]}
                    >
                      {item.title || t("marketplace.defaultTitle")}
                    </Text>
                    <Text
                      style={[styles.postDate, { color: theme.colors.muted }]}
                    >
                      {t("marketplace.generatedOn")}{" "}
                      {formatDateDisplay(item.created_at, i18n.language)}
                    </Text>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                    <IconButton
                      onPress={() => handleEditTitle(item)}
                      variant="ghost"
                    >
                      <Feather
                        name="edit"
                        size={24}
                        color={theme.colors.accent}
                      />
                    </IconButton>
                  </View>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: theme.spacing.sm }} />
            )}
          />
        )}
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
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
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    postTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
    },
    postDate: {
      fontSize: theme.typography.xs,
      fontWeight: "600",
    },
  });
