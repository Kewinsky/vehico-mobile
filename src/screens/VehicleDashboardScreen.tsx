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
import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { AppNavbar } from "../ui/components/AppNavbar";
import { Tile as TileCard } from "../ui/components/Tile";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingView } from "../ui/components/LoadingView";
import { WheelsIcon } from "../ui/components/WheelsIcon";
import { AppLayout } from "../ui/components/AppLayout";
import { DashboardFab } from "../ui/components/DashboardFab";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

/** Set to true to show the floating action button (add service/fuel/reminder). */
const SHOW_DASHBOARD_FAB = false;

type DashboardTile = {
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
  const { vehicleId } = route.params;
  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

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
    [vehicleId, t],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => {
      void load({ showLoading: false });
      // Keep entitlements fresh so FAB reminder limit check uses current freePlanReminderIds
      void refreshEntitlements();
    });
    return unsub;
  }, [navigation, load, refreshEntitlements]);

  async function onCopyVin() {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("manageVehicle.vinCopied"));
    }
  }

  function handleSharePress() {
    if (isPremium) {
      navigation.navigate("Share", { vehicleId });
      return;
    }

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
  }

  const tiles: DashboardTile[] = [
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
      onPress: () => navigation.navigate("ServiceHistory", { vehicleId }),
    },
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
    {
      key: "share",
      title: t("dashboard.tiles.shareTitle"),
      icon: "share-social",
      onPress: handleSharePress,
    },
    {
      key: "data",
      title: t("dashboard.tiles.dataTitle"),
      icon: "download",
      onPress: () => navigation.navigate("DataPortability", { vehicleId }),
    },
  ];

  const handleAddService = useCallback(() => {
    navigation.navigate("ServiceEntryForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleAddFuel = useCallback(() => {
    navigation.navigate("FuelingEntryForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleAddReminder = useCallback(() => {
    if (!isPremium && freePlanVehicleId === vehicleId) {
      const visibleCount = freePlanReminderIds?.length ?? 0;
      if (visibleCount >= remindersLimit) {
        Alert.alert(
          t("limits.reminderLimitReachedTitle"),
          t("limits.reminderLimitReachedBody", { limit: remindersLimit }),
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
    }
    navigation.navigate("ReminderForm", { vehicleId });
  }, [
    navigation,
    vehicleId,
    isPremium,
    freePlanVehicleId,
    freePlanReminderIds,
    remindersLimit,
    t,
  ]);

  return (
    <AppLayout
      loading={loading}
      header={
        <AppNavbar
          onBack={() => navigation.goBack()}
          showProfileAvatar
          showShopIcon={!isPremium}
        />
      }
    >
      <FlatList
        data={tiles}
        numColumns={2}
        keyExtractor={(t) => t.key}
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
          <TileCard
            onPress={item.onPress}
            minHeight={110}
            title={item.title}
            icon={
              item.key === "fuel" ? (
                <Fuel size={32} color={theme.colors.accent} />
              ) : item.key === "data" ? (
                <Database size={32} color={theme.colors.accent} />
              ) : item.key === "wheels" ? (
                <WheelsIcon size={48} color={theme.colors.accent} />
              ) : (
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={theme.colors.accent}
                />
              )
            }
          />
        )}
      />

      {SHOW_DASHBOARD_FAB && (
        <DashboardFab
          onAddService={handleAddService}
          onAddFuel={handleAddFuel}
          onAddReminder={handleAddReminder}
        />
      )}
    </AppLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    header: {
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.bold,
    },
    listHeader: {
      width: "100%",
    },
    row: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
  });
