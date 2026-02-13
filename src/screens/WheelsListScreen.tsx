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
import type { VehicleWheel } from "../types/domain";
import {
  listVehicleWheels,
  formatWheelDimensions,
} from "../services/wheels/wheelsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "WheelsList">;

function wheelSubtitle(
  wheel: VehicleWheel,
  t: (key: string) => string,
): string {
  const dims = formatWheelDimensions(wheel.width_inch, wheel.diameter_inch);
  const parts: string[] = [dims];
  if (wheel.et_offset != null) parts.push(`ET${wheel.et_offset}`);
  if (wheel.bolt_pattern?.trim()) parts.push(wheel.bolt_pattern.trim());
  if (wheel.center_bore_mm != null) {
    const abbr = t("wheels.centerBoreAbbr");
    parts.push(`${abbr} ${wheel.center_bore_mm}mm`);
  }
  if (wheel.bolt_type?.trim()) parts.push(wheel.bolt_type.trim());
  if (wheel.weight_kg != null) parts.push(`${wheel.weight_kg} kg`);
  return parts.join(" · ");
}

export function WheelsListScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const { isPremium, wheelsPerVehicleLimit } = useEntitlements();

  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleWheels(
          vehicleId,
          isPremium ? undefined : { limit: wheelsPerVehicleLimit },
        );
        setWheels(data);
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
    [vehicleId, t, isPremium, wheelsPerVehicleLimit],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

  function onAddWheelPress() {
    if (isPremium) {
      navigation.navigate("WheelForm", { vehicleId });
      return;
    }
    if (wheels.length >= wheelsPerVehicleLimit) {
      Alert.alert(
        t("limits.wheelLimitReachedTitle"),
        t("limits.wheelLimitReachedBody", { limit: wheelsPerVehicleLimit }),
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
    navigation.navigate("WheelForm", { vehicleId });
  }

  return (
    <Screen
      padding={false}
      header={<AppHeader onBack={() => navigation.goBack()} />}
      footer={
        <Button onPress={onAddWheelPress}>{t("wheels.addWheelSingle")}</Button>
      }
    >
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("wheels.rimsSection")}
        </Text>
      </View>
      <FlatList
        data={wheels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
          paddingBottom: theme.spacing.xl,
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing.sm }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            onPress={() =>
              navigation.navigate("WheelForm", {
                vehicleId,
                wheelId: item.id,
              })
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
                    {wheelSubtitle(item, t)}
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
              {t("wheels.noWheels")}
            </Text>
          )
        }
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      marginHorizontal: theme.layout.contentPaddingHorizontal,
    },

    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      marginVertical: theme.spacing.md,
    },
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
