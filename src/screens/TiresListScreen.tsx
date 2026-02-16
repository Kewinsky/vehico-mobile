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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleTire } from "../types/domain";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../services/tires/tiresRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<AppStackParamList, "TiresList">;

function tireSubtitle(tire: VehicleTire, t: (key: string) => string): string {
  const dims = formatTireDimensions(
    tire.width_mm,
    tire.aspect_ratio,
    tire.diameter_inch,
  );
  const typeLabel = t(`tireForm.types.${tire.tire_type}`);
  const parts = [dims, typeLabel];
  if (tire.dot?.trim()) parts.push(`DOT ${tire.dot.trim()}`);
  return parts.join(" · ");
}

export function TiresListScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId } = route.params;
  const { isPremium, tiresPerVehicleLimit } = useEntitlements();

  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleTires(
          vehicleId,
          isPremium ? undefined : { limit: tiresPerVehicleLimit },
        );
        setTires(data);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as any).message)
            : t("common.error");
        toastError(message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t, isPremium, tiresPerVehicleLimit],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

  function onAddTirePress() {
    if (!isPremium) {
      Alert.alert(
        t("limits.premiumRequiredTitle"),
        t("limits.premiumRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    if (tires.length >= tiresPerVehicleLimit) {
      Alert.alert(
        t("limits.tireLimitReachedTitle"),
        t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("TireForm", { vehicleId });
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
      footer={
        <Button onPress={onAddTirePress}>{t("wheels.addTireSingle")}</Button>
      }
    >
      <ScreenLayout title={t("wheels.tiresSection")} scrollable={false}>
        <FlatList
          data={tires}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              onPress={() =>
                navigation.navigate("TireForm", { vehicleId, tireId: item.id })
              }
            >
              <View
                style={[
                  styles.card,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.itemTitle, { color: theme.colors.fg }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.is_currently_fitted && (
                        <View
                          style={[
                            styles.badge,
                            {
                              borderColor: theme.colors.accent,
                              backgroundColor: theme.colors.accent,
                            },
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {t("wheels.currentlyFitted")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemSubtitle,
                        {
                          color: theme.colors.muted,
                          marginTop: theme.spacing.xs / 2,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {tireSubtitle(item, t)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.colors.accent}
                  />
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <LoadingIndicator />
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                {t("wheels.noTires")}
              </Text>
            )
          }
        />
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    list: { flex: 1 },
    listContent: { paddingBottom: insets.bottom + theme.spacing.xl },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    itemTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    badge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: theme.typography.xs,
      fontWeight: "700",
      color: "#000000",
      letterSpacing: 0.3,
    },
    itemSubtitle: {
      fontSize: theme.typography.small,
    },
    loadingContainer: {
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: theme.typography.small,
    },
  });
