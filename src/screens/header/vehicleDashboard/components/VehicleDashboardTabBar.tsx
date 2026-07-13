import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormGlassSurface } from "../../../../ui/components/common/FormGlassSurface";
import { useTheme } from "../../../../ui/ThemeProvider";
import { makeDashboardScreenStyles } from "../dashboardScreenStyles";

const DASHBOARD_SECTIONS = [
  {
    routeName: "Menu",
    icon: "apps-outline" as const,
    activeIcon: "apps" as const,
    labelKey: "dashboard.pager.menu",
  },
  {
    routeName: "Overview",
    icon: "car-sport-outline" as const,
    activeIcon: "car-sport" as const,
    labelKey: "dashboard.pager.overview",
  },
  {
    routeName: "Stats",
    icon: "stats-chart-outline" as const,
    activeIcon: "stats-chart" as const,
    labelKey: "dashboard.pager.statistics",
  },
] as const;

export function VehicleDashboardTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeDashboardScreenStyles(theme, insets);

  return (
    <View
      style={[styles.pagerDotsContainer, { bottom: insets.bottom }]}
      pointerEvents="box-none"
    >
      <View style={styles.pagerDots}>
        <FormGlassSurface shape="capsule" />
        {state.routes.map((route, index) => {
          const section = DASHBOARD_SECTIONS[index];
          if (!section) return null;
          const isFocused = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t(section.labelKey)}
              style={[
                styles.pagerTab,
                isFocused && { backgroundColor: `${theme.colors.accent}24` },
              ]}
            >
              <Ionicons
                name={isFocused ? section.activeIcon : section.icon}
                size={23}
                color={isFocused ? theme.colors.accent : theme.colors.muted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
