import React, { createContext, useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Fuel } from "lucide-react-native";

import { navigationRef } from "../navigationRef";
import { useTheme } from "../../ui/ThemeProvider";

type QuickActionsContextValue = {
  openQuickActions: () => void;
  closeQuickActions: () => void;
  currentVehicleId: string | null;
  setCurrentVehicleId: (id: string | null) => void;
};

const noop = () => {};

const QuickActionsContext = createContext<QuickActionsContextValue>({
  openQuickActions: noop,
  closeQuickActions: noop,
  currentVehicleId: null,
  setCurrentVehicleId: noop,
});

export function useQuickActions() {
  return React.useContext(QuickActionsContext);
}

function QuickActionsModal({
  visible,
  onClose,
  vehicleId,
}: {
  visible: boolean;
  onClose: () => void;
  vehicleId: string | null;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeModalStyles(theme, insets.bottom),
    [theme, insets.bottom]
  );

  const navigateTo = useCallback(
    (screen: "ServiceEntryForm" | "FuelingEntryForm" | "ReminderForm") => {
      if (!vehicleId) return;
      onClose();
      if (navigationRef.isReady()) {
        navigationRef.navigate("MainTabs", {
          screen: "Dashboard",
          params: {
            screen,
            params: { vehicleId },
          },
        });
      }
    },
    [vehicleId, onClose]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {vehicleId ? (
            <>
              <Pressable
                onPress={() => navigateTo("ServiceEntryForm")}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Ionicons
                  name="construct"
                  size={22}
                  color={theme.colors.accent}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
                  {t("dashboard.quickActions.addService")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigateTo("FuelingEntryForm")}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Fuel size={22} color={theme.colors.accent} />
                <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
                  {t("dashboard.quickActions.addFuel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigateTo("ReminderForm")}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Ionicons
                  name="notifications"
                  size={22}
                  color={theme.colors.accent}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.fg }]}>
                  {t("dashboard.quickActions.addReminder")}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.noVehicle}>
              <Text style={[styles.noVehicleText, { color: theme.colors.fg }]}>
                {t("dashboard.quickActions.selectVehicle")}
              </Text>
              <Pressable
                onPress={() => {
                  onClose();
                  if (navigationRef.isReady()) {
                    navigationRef.navigate("Vehicles");
                  }
                }}
                style={({ pressed }) => [
                  styles.goToVehiclesBtn,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={styles.goToVehiclesText}>
                  {t("dashboard.backToVehicles")}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeModalStyles(
  theme: {
    colors: { fg: string; accent: string; card: string; border: string };
    spacing: { md: number; sm: number };
    radius: { md: number };
    typography: { body: number };
  },
  safeAreaBottom: number
) {
  const tabBarHeight = 56;
  const tabBarAreaHeight = safeAreaBottom + tabBarHeight;
  const gapAboveTabs = 20;
  const marginAboveTabs = tabBarAreaHeight + gapAboveTabs;

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingBottom: marginAboveTabs,
      paddingHorizontal: theme.spacing.md,
    },
    content: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 260,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    menuItemPressed: {
      opacity: 0.7,
    },
    menuItemText: {
      fontSize: theme.typography.body,
      fontWeight: "600",
      textAlign: "center",
    },
    noVehicle: {
      padding: theme.spacing.md,
      alignItems: "center",
      gap: theme.spacing.md,
    },
    noVehicleText: {
      fontSize: theme.typography.body,
      textAlign: "center",
    },
    goToVehiclesBtn: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    goToVehiclesText: {
      color: "#000000",
      fontWeight: "600",
      fontSize: theme.typography.body,
    },
  });
}

export function QuickActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [currentVehicleId, setCurrentVehicleId] = useState<string | null>(null);

  const openQuickActions = useCallback(() => setVisible(true), []);
  const closeQuickActions = useCallback(() => setVisible(false), []);

  const value = useMemo<QuickActionsContextValue>(
    () => ({
      openQuickActions,
      closeQuickActions,
      currentVehicleId,
      setCurrentVehicleId,
    }),
    [openQuickActions, closeQuickActions, currentVehicleId]
  );

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <QuickActionsModal
        visible={visible}
        onClose={closeQuickActions}
        vehicleId={currentVehicleId}
      />
    </QuickActionsContext.Provider>
  );
}
