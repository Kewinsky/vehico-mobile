import React from "react";
import { Pressable, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { MainTabsParamList } from "./types";
import { DashboardStackNavigator } from "./DashboardStackNavigator";
import { ProfileStackNavigator } from "./ProfileStackNavigator";
import { PlaceholderScreen } from "../../screens/PlaceholderScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { useQuickActions } from "../providers/QuickActionsProvider";

const Tab = createBottomTabNavigator<MainTabsParamList>();

function QuickActionsTabButton() {
  const { theme } = useTheme();
  const { openQuickActions } = useQuickActions();

  return (
    <Pressable
      onPress={openQuickActions}
      accessibilityRole="button"
      accessibilityLabel="Quick actions"
      style={({ pressed }) => ({
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.accent,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name="add" size={28} color="#000000" />
      </View>
    </Pressable>
  );
}

export function MainTabsNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          title: t("tabs.dashboard"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Placeholder"
        component={PlaceholderScreen}
        options={{
          title: t("tabs.placeholder"),
          tabBarLabel: () => null,
          tabBarButton: () => <QuickActionsTabButton />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
