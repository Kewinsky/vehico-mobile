import { Ionicons } from "@expo/vector-icons";
import { Platform, type ImageSourcePropType } from "react-native";

import type { VehicleDashboardTabName } from "./navigationTypes";
import { VEHICLE_DASHBOARD_TAB_CONFIG } from "./vehicleDashboardNativeTabOptions.shared";

const ANDROID_TAB_ICON_SIZE = 24;
/** Bottom nav tints icons via tabBarActiveTintColor / tabBarInactiveTintColor. */
const ANDROID_TAB_ICON_COLOR = "#000000";

const iconCache = new Map<string, ImageSourcePropType>();
let loadPromise: Promise<void> | null = null;

function iconCacheKey(tab: VehicleDashboardTabName, focused: boolean): string {
  return `${tab}:${focused ? "focused" : "unfocused"}`;
}

export function ensureVehicleDashboardAndroidTabIconsLoaded(): Promise<void> {
  if (Platform.OS !== "android") {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = Promise.all(
    (
      Object.keys(VEHICLE_DASHBOARD_TAB_CONFIG) as VehicleDashboardTabName[]
    ).flatMap((tab) => {
      const config = VEHICLE_DASHBOARD_TAB_CONFIG[tab];
      return [
        Ionicons.getImageSource(
          config.androidFocused,
          ANDROID_TAB_ICON_SIZE,
          ANDROID_TAB_ICON_COLOR,
        ).then((source) => {
          if (source) {
            iconCache.set(iconCacheKey(tab, true), source);
          }
        }),
        Ionicons.getImageSource(
          config.androidUnfocused,
          ANDROID_TAB_ICON_SIZE,
          ANDROID_TAB_ICON_COLOR,
        ).then((source) => {
          if (source) {
            iconCache.set(iconCacheKey(tab, false), source);
          }
        }),
      ];
    }),
  ).then(() => undefined);

  return loadPromise;
}

export function getVehicleDashboardAndroidTabIcon(
  tab: VehicleDashboardTabName,
  focused: boolean,
): ImageSourcePropType {
  return iconCache.get(iconCacheKey(tab, focused)) ?? { uri: "" };
}

if (Platform.OS === "android") {
  void ensureVehicleDashboardAndroidTabIconsLoaded();
}
