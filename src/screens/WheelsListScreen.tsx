import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleWheels(vehicleId);
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
    [vehicleId, t],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("wheels.rimsSection")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {t("dashboard.tiles.wheelsSubtitle")}
          </Text>
        </View>
        <View style={{ height: theme.spacing.sm }} />
        <Button onPress={() => navigation.navigate("WheelForm", { vehicleId })}>
          {t("wheels.addWheelSingle")}
        </Button>
      </View>
      <FlatList
        data={wheels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing.sm }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            onPress={() =>
              navigation.navigate("WheelDetail", {
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
                  color={theme.colors.muted}
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
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.muted, marginTop: theme.spacing.xs },
              ]}
            >
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
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: theme.typography.small,
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
      paddingHorizontal: theme.spacing.sm / 2,
      paddingVertical: theme.spacing.xs,
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
