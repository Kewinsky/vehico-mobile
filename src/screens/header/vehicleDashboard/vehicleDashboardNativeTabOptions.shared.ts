import type { VehicleDashboardTabName } from "./navigationTypes";

export type VehicleDashboardTabIconConfig = {
  labelKey: string;
  sfFocused: string;
  sfUnfocused: string;
  androidFocused: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  androidUnfocused: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
};

export const VEHICLE_DASHBOARD_TAB_CONFIG: Record<
  VehicleDashboardTabName,
  VehicleDashboardTabIconConfig
> = {
  Menu: {
    labelKey: "dashboard.pager.menu",
    sfFocused: "square.grid.2x2.fill",
    sfUnfocused: "square.grid.2x2",
    androidFocused: "grid",
    androidUnfocused: "grid-outline",
  },
  Overview: {
    labelKey: "dashboard.pager.overview",
    sfFocused: "car.fill",
    sfUnfocused: "car",
    androidFocused: "car",
    androidUnfocused: "car-outline",
  },
  Stats: {
    labelKey: "dashboard.pager.statistics",
    sfFocused: "chart.bar.fill",
    sfUnfocused: "chart.bar",
    androidFocused: "bar-chart",
    androidUnfocused: "bar-chart-outline",
  },
};
