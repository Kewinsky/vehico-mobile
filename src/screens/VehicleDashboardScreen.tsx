import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import type { DashboardStackParamList } from "../app/navigation/types";
import { navigationRef } from "../app/navigationRef";
import { useQuickActions } from "../app/providers/QuickActionsProvider";
import type { Vehicle } from "../types/domain";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<
  DashboardStackParamList,
  "VehicleDashboard"
>;

type Tile = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { setCurrentVehicleId } = useQuickActions();
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentVehicleId(vehicleId);
    return () => setCurrentVehicleId(null);
  }, [vehicleId, setCurrentVehicleId]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const v = await getVehicle(vehicleId);
        setVehicle(v);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t]
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
    return unsub;
  }, [navigation, load]);

  async function onCopyVin() {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("manageVehicle.vinCopied"));
    }
  }

  const tiles: Tile[] = [
    // Row 1: Statistics + Service history
    {
      key: "stats",
      title: t("dashboard.tiles.statsTitle"),
      icon: "stats-chart",
      onPress: () => navigation.navigate("Statistics", { vehicleId }),
    },
    {
      key: "service",
      title: t("dashboard.tiles.serviceTitle"),
      icon: "construct",
      onPress: () => navigation.navigate("VehicleDetail", { vehicleId }),
    },
    // Row 2: Manage vehicle + Documents
    {
      key: "manage",
      title: t("dashboard.tiles.manageTitle"),
      icon: "car",
      onPress: () => navigation.navigate("ManageVehicle", { vehicleId }),
    },
    {
      key: "docs",
      title: t("dashboard.tiles.docsTitle"),
      icon: "document-text",
      onPress: () => navigation.navigate("Documents", { vehicleId }),
    },
    // Row 3: Fuel + Reminders
    {
      key: "fuel",
      title: t("dashboard.tiles.fuelTitle"),
      icon: "flash",
      onPress: () => navigation.navigate("Fuel", { vehicleId }),
    },
    {
      key: "reminders",
      title: t("dashboard.tiles.remindersTitle"),
      icon: "notifications",
      onPress: () => navigation.navigate("Reminders", { vehicleId }),
    },
    // Row 4: Wheels + Workshops
    {
      key: "wheels",
      title: t("dashboard.tiles.wheelsTitle"),
      icon: "disc",
      onPress: () => navigation.navigate("Wheels", { vehicleId }),
    },
    {
      key: "workshops",
      title: t("dashboard.tiles.workshopsTitle"),
      icon: "business",
      onPress: () => navigation.navigate("Workshops"),
    },
    // Row 5: Share + Export/Import
    {
      key: "share",
      title: t("dashboard.tiles.shareTitle"),
      icon: "share-social",
      onPress: () => navigation.navigate("Share", { vehicleId }),
    },
    {
      key: "data",
      title: t("dashboard.tiles.dataTitle"),
      icon: "download",
      onPress: () => navigation.navigate("DataPortability", { vehicleId }),
    },
  ];

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigationRef.navigate("Vehicles")} />
      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <LoadingIndicator />
        </View>
      ) : (
        <FlatList
          data={tiles}
          numColumns={2}
          keyExtractor={(t) => t.key}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
                </Text>
                {vehicle?.vin && (
                  <Pressable
                    onPress={onCopyVin}
                    style={styles.vinRow}
                    hitSlop={10}
                  >
                    <Text style={styles.vinText}>{vehicle.vin}</Text>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={theme.colors.muted}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
              ]}
            >
              {item.key === "fuel" ? (
                <Fuel size={32} color={theme.colors.accent} />
              ) : item.key === "data" ? (
                <Database size={32} color={theme.colors.accent} />
              ) : (
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={theme.colors.accent}
                />
              )}
              <Text style={styles.tileTitle}>{item.title}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    header: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    list: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.xl,
      gap: theme.spacing.xs,
    },
    listHeader: {
      width: "100%",
    },
    row: {
      gap: theme.spacing.xs,
    },
    tile: {
      flex: 1,
      minHeight: 110,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      fontWeight: "800",
      textAlign: "center",
    },
  });
