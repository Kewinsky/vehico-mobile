import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { WheelsIcon } from "../ui/components/WheelsIcon";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

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
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

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
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

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

  const tiles: Tile[] = [
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

  const handleAddService = () => {
    setShowMenu(false);
    navigation.navigate("ServiceEntryForm", { vehicleId });
  };

  const handleAddFuel = () => {
    setShowMenu(false);
    navigation.navigate("FuelingEntryForm", { vehicleId });
  };

  const handleAddReminder = () => {
    setShowMenu(false);
    navigation.navigate("ReminderForm", { vehicleId });
  };

  useEffect(() => {
    if (showMenu) {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(menuTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(menuTranslateY, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenu]);

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
      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: theme.layout.contentPaddingHorizontal,
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
              ) : item.key === "wheels" ? (
                <WheelsIcon size={48} color={theme.colors.accent} />
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

      <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
        <Animated.View
          style={[
            styles.menuOverlay,
            {
              opacity: overlayOpacity,
            },
          ]}
          pointerEvents={showMenu ? "auto" : "none"}
        />
      </TouchableWithoutFeedback>
      <View style={styles.fabContainer}>
        <Animated.View
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
          pointerEvents={showMenu ? "auto" : "none"}
        >
          <Pressable
            onPress={handleAddService}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons
                name="construct"
                size={20}
                color={theme.colors.accent}
              />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
              {t("dashboard.quickActions.addService")}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleAddFuel}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.menuItemIconContainer}>
              <Fuel size={20} color={theme.colors.accent} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
              {t("dashboard.quickActions.addFuel")}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleAddReminder}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.menuItemIconContainer}>
              <Ionicons
                name="notifications"
                size={20}
                color={theme.colors.accent}
              />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
              {t("dashboard.quickActions.addReminder")}
            </Text>
          </Pressable>
        </Animated.View>
        <Pressable
          onPress={() => setShowMenu(!showMenu)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.accent,
            },
            pressed && styles.fabPressed,
          ]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: iconRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "45deg"],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={24} color="#000000" />
          </Animated.View>
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    header: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xs / 2,
      marginBottom: theme.titleMarginBottom,
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
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
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
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
    menuOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    fabContainer: {
      position: "absolute",
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
      zIndex: 1000,
    },
    fab: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      elevation: 4,
    },
    fabPressed: {
      opacity: 0.9,
    },
    menu: {
      position: "absolute",
      bottom: 60,
      right: 0,
      minWidth: 200,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingVertical: theme.spacing.xs,
      elevation: 8,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    menuItemIconContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    menuItemPressed: {
      opacity: 0.7,
    },
    menuItemText: {
      fontSize: theme.typography.body,
      fontWeight: "500",
    },
  });
