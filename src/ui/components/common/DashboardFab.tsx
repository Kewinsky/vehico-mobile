import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Fuel } from "lucide-react-native";

import { hexToRgba } from "./ChoiceChip";
import { useTheme } from "../../ThemeProvider";

export type DashboardFabProps = {
  onAddService: () => void;
  onAddFuel: () => void;
  onAddReminder: () => void;
};

export function DashboardFab({
  onAddService,
  onAddFuel,
  onAddReminder,
}: DashboardFabProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => StyleSheet.create(makeStyles(theme)), [theme]);

  const [showMenu, setShowMenu] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

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
  }, [showMenu, menuOpacity, menuTranslateY, overlayOpacity, iconRotation]);

  const handleAddService = useCallback(() => {
    setShowMenu(false);
    onAddService();
  }, [onAddService]);

  const handleAddFuel = useCallback(() => {
    setShowMenu(false);
    onAddFuel();
  }, [onAddFuel]);

  const handleAddReminder = useCallback(() => {
    setShowMenu(false);
    onAddReminder();
  }, [onAddReminder]);

  return (
    <>
      <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
        <Animated.View
          style={[styles.menuOverlay, { opacity: overlayOpacity }]}
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
            <View
              style={[
                styles.menuItemIconContainer,
                { backgroundColor: hexToRgba("#2563EB", 0.18) },
              ]}
            >
              <Ionicons name="construct" size={20} color="#2563EB" />
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
            <View
              style={[
                styles.menuItemIconContainer,
                { backgroundColor: hexToRgba("#D97706", 0.18) },
              ]}
            >
              <Fuel size={20} color="#D97706" />
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
            <View
              style={[
                styles.menuItemIconContainer,
                { backgroundColor: hexToRgba("#7C3AED", 0.18) },
              ]}
            >
              <Ionicons name="notifications" size={20} color="#7C3AED" />
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
    </>
  );
}

function makeStyles(theme: any) {
  return {
    menuOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    fabContainer: {
      position: "absolute" as const,
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
      zIndex: 1000,
    },
    fab: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.xl,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      elevation: 4,
    },
    fabPressed: {
      opacity: 0.9,
    },
    menu: {
      position: "absolute" as const,
      bottom: 60,
      right: 0,
      minWidth: 200,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      paddingVertical: theme.spacing.xs,
      elevation: 8,
    },
    menuItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    menuItemIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    menuItemPressed: {
      opacity: 0.7,
    },
    menuItemText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  };
}
