import {
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
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

type Tile = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { vehicleId, title } = route.params;
  const [showMenu, setShowMenu] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  const tiles: Tile[] = [
    {
      key: "service",
      title: t("dashboard.tiles.serviceTitle"),
      subtitle: t("dashboard.tiles.serviceSubtitle"),
      icon: "construct",
      onPress: () => navigation.navigate("VehicleDetail", { vehicleId, title }),
    },
    {
      key: "fuel",
      title: t("dashboard.tiles.fuelTitle"),
      subtitle: t("dashboard.tiles.fuelSubtitle"),
      icon: "car",
      onPress: () => navigation.navigate("Fuel", { vehicleId, title }),
    },
    {
      key: "stats",
      title: t("dashboard.tiles.statsTitle"),
      subtitle: t("dashboard.tiles.statsSubtitle"),
      icon: "stats-chart",
      onPress: () => navigation.navigate("Statistics", { vehicleId, title }),
    },
    {
      key: "docs",
      title: t("dashboard.tiles.docsTitle"),
      subtitle: t("dashboard.tiles.docsSubtitle"),
      icon: "document-text",
      onPress: () => navigation.navigate("Documents", { vehicleId, title }),
    },
    {
      key: "reminders",
      title: t("dashboard.tiles.remindersTitle"),
      subtitle: t("dashboard.tiles.remindersSubtitle"),
      icon: "notifications",
      onPress: () => navigation.navigate("Reminders", { vehicleId, title }),
    },
    {
      key: "share",
      title: t("dashboard.tiles.shareTitle"),
      subtitle: t("dashboard.tiles.shareSubtitle"),
      icon: "share",
      onPress: () => navigation.navigate("Share", { vehicleId, title }),
    },
    {
      key: "data",
      title: t("dashboard.tiles.dataTitle"),
      subtitle: t("dashboard.tiles.dataSubtitle"),
      icon: "download",
      onPress: () =>
        navigation.navigate("DataPortability", { vehicleId, title }),
    },
    {
      key: "manage",
      title: t("dashboard.tiles.manageTitle"),
      subtitle: t("dashboard.tiles.manageSubtitle"),
      icon: "settings",
      onPress: () => navigation.navigate("ManageVehicle", { vehicleId, title }),
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
      // Animate menu in
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
      // Animate menu out
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
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <FlatList
        data={tiles}
        numColumns={2}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.header}>
              <Text style={styles.kicker}>{t("dashboard.kicker")}</Text>
              <Text style={styles.title}>{title}</Text>
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
            <View style={styles.tileIconContainer}>
              <Ionicons
                name={item.icon}
                size={24}
                color={theme.colors.accent}
              />
            </View>
            <View style={styles.tileContent}>
              <Text style={styles.tileTitle}>{item.title}</Text>
              <Text style={styles.tileSubtitle}>{item.subtitle}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Floating Action Button */}
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
              <Ionicons name="car" size={20} color={theme.colors.accent} />
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
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    header: {
      paddingTop: 12,
      paddingBottom: 12,
      gap: 4,
    },
    kicker: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.fg,
      fontSize: 20,
      fontWeight: "800",
    },
    list: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + 80, // Extra padding for FAB
      gap: 8,
    },
    listHeader: {
      width: "100%",
    },
    row: {
      gap: 8,
    },
    tile: {
      flex: 1,
      minHeight: 110,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      gap: 8,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.accent + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    tileContent: {
      flex: 1,
      gap: 4,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: 15,
      fontWeight: "800",
    },
    tileSubtitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      lineHeight: 16,
    },
    menuOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
    },
    fabContainer: {
      position: "absolute",
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
      zIndex: 1000,
    },
    fab: {
      width: 50,
      height: 50,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    menuItemIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.accent + "15",
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
