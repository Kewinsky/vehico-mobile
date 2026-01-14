import { useCallback, useEffect, useMemo, useState } from "react";
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

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { listVehicles } from "../services/vehicles/vehiclesRepo";
import { useAuth } from "../app/providers/AuthProvider";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { AppHeader } from "../ui/components/AppHeader";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "Vehicles">;

export function VehiclesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { signOut } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function onSignOut() {
    signOut().catch((e: any) => {
      toastError(t("common.error"), e?.message ?? String(e));
    });
  }

  const load = useCallback(async (opts?: { refreshing?: boolean }) => {
    try {
      if (opts?.refreshing) setRefreshing(true);
      else setLoading(true);
      const data = await listVehicles();
      setItems(data);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      if (opts?.refreshing) setRefreshing(false);
      else setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  return (
    <Screen padding={false}>
      <AppHeader />
      <View style={styles.top}>
        <Text style={styles.title}>{t("vehicles.title")}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={10}
          >
            <Text style={styles.actionText}>{t("common.settings")}</Text>
          </Pressable>
          <Pressable onPress={onSignOut} hitSlop={10}>
            <Text style={styles.actionText}>{t("common.signOut")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {items.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t("vehicles.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("vehicles.emptyBody")}</Text>
            <View style={{ height: 16 }} />
            <Button onPress={() => navigation.navigate("VehicleForm")}>
              {t("vehicles.addVehicle")}
            </Button>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(v) => v.id}
              contentContainerStyle={styles.list}
              refreshing={refreshing}
              onRefresh={() => void load({ refreshing: true })}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    navigation.navigate("VehicleDashboard", {
                      vehicleId: item.id,
                      title: item.title,
                    })
                  }
                  style={({ pressed }) => [
                    styles.vehicleCard,
                    pressed && styles.vehicleCardPressed,
                  ]}
                >
                  <View style={styles.vehicleTopRow}>
                    <View style={styles.vehicleTitleRow}>
                      <View style={styles.accentBar} />
                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.vehicleMeta} numberOfLines={1}>
                      {item.make} {item.model} · {item.production_year}
                    </Text>
                  </View>
                </Pressable>
              )}
              ListFooterComponent={
                <View style={{ paddingTop: 12 }}>
                  <Button onPress={() => navigation.navigate("VehicleForm")}>
                    {t("vehicles.addVehicle")}
                  </Button>
                </View>
              }
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    top: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: { fontSize: 26, fontWeight: "800", color: theme.colors.fg },
    actions: { flexDirection: "row", alignItems: "center", gap: 14 },
    actionText: { fontWeight: "800", color: theme.colors.muted },
    body: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 12,
    },
    empty: {
      flex: 1,
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      marginTop: 8,
      lineHeight: 22,
      color: theme.colors.muted,
    },
    list: {
      paddingBottom: 32,
      gap: 12,
    },
    vehicleCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 8,
    },
    vehicleCardPressed: {
      opacity: 0.92,
    },
    vehicleTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    vehicleTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    accentBar: {
      width: 3,
      height: 18,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
    vehicleTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.fg,
      flex: 1,
      minWidth: 0,
    },
    chevron: { fontSize: 18, color: theme.colors.muted, fontWeight: "900" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    pillText: { fontSize: 12, fontWeight: "800", color: theme.colors.muted },
    vehicleMeta: {
      fontSize: 13,
      color: theme.colors.muted,
      flex: 1,
      minWidth: 0,
    },
  });
