import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/ui/ThemeProvider";

export default function VehicleDashboardLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <NativeTabs
      labelVisibilityMode="unlabeled"
      tintColor={theme.colors.accent}
      iconColor={theme.colors.muted}
    >
      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Icon
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="apps-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon family={Ionicons} name="apps" />
            ),
          }}
        />
        <NativeTabs.Trigger.Label>
          {t("dashboard.pager.menu")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="car-sport-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="car-sport"
              />
            ),
          }}
        />
        <NativeTabs.Trigger.Label>
          {t("dashboard.pager.overview")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="statistics">
        <NativeTabs.Trigger.Icon
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="stats-chart-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="stats-chart"
              />
            ),
          }}
        />
        <NativeTabs.Trigger.Label>
          {t("dashboard.pager.statistics")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
