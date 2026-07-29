import type { TFunction } from "i18next";

import type { NativeBottomTabNavigationOptions } from "@bottom-tabs/react-navigation";

import type { VehicleDashboardTabName } from "./navigationTypes";
import { VEHICLE_DASHBOARD_TAB_CONFIG } from "./vehicleDashboardNativeTabOptions.shared";

export function getVehicleDashboardTabOptions(
  tab: VehicleDashboardTabName,
  t: TFunction,
): NativeBottomTabNavigationOptions {
  const config = VEHICLE_DASHBOARD_TAB_CONFIG[tab];
  const label = t(config.labelKey);

  return {
    title: label,
    tabBarLabel: label,
    tabBarIcon: ({ focused }) => ({
      sfSymbol: (focused ? config.sfFocused : config.sfUnfocused) as never,
    }),
  };
}
