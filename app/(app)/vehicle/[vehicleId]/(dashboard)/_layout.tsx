import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/ui/ThemeProvider";

export default function VehicleDashboardLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{
          title: t("dashboard.pager.menu"),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "apps" : "apps-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t("dashboard.pager.overview"),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "car-sport" : "car-sport-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: t("dashboard.pager.statistics"),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
