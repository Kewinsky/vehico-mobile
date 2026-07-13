import type { TFunction } from "i18next";

import type { NativeBottomTabNavigationOptions } from "@bottom-tabs/react-navigation";

import type { VehicleDashboardTabName } from "./navigationTypes";

const TAB_CONFIG: Record<
  VehicleDashboardTabName,
  {
    labelKey: string;
    sfFocused: string;
    sfUnfocused: string;
  }
> = {
  Menu: {
    labelKey: "dashboard.pager.menu",
    sfFocused: "square.grid.2x2.fill",
    sfUnfocused: "square.grid.2x2",
  },
  Overview: {
    labelKey: "dashboard.pager.overview",
    sfFocused: "car.fill",
    sfUnfocused: "car",
  },
  Stats: {
    labelKey: "dashboard.pager.statistics",
    sfFocused: "chart.bar.fill",
    sfUnfocused: "chart.bar",
  },
};

export function getVehicleDashboardTabOptions(
  tab: VehicleDashboardTabName,
  t: TFunction,
): NativeBottomTabNavigationOptions {
  const config = TAB_CONFIG[tab];
  const label = t(config.labelKey);

  return {
    title: label,
    tabBarLabel: label,
    tabBarIcon: ({ focused }) => ({
      sfSymbol: (focused ? config.sfFocused : config.sfUnfocused) as never,
    }),
  };
}
