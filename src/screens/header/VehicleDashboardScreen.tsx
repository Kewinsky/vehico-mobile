import { useMemo } from "react";
import { View } from "react-native";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { Settings, Warehouse } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { DashboardFab } from "../../ui/components/common/DashboardFab";
import {
  SourcePickerMenu,
  type SourcePickerMenuItem,
} from "../../ui/components/common/SourcePickerMenu";
import { useTheme } from "../../ui/ThemeProvider";
import { makeDashboardScreenStyles } from "./vehicleDashboard/dashboardScreenStyles";
import { VehicleDashboardMenuScreen } from "./vehicleDashboard/screens/VehicleDashboardMenuScreen";
import { VehicleDashboardOverviewScreen } from "./vehicleDashboard/screens/VehicleDashboardOverviewScreen";
import { VehicleDashboardStatsScreen } from "./vehicleDashboard/screens/VehicleDashboardStatsScreen";
import {
  VehicleDashboardProvider,
  useVehicleDashboard,
} from "./vehicleDashboard/VehicleDashboardContext";
import { VehicleDashboardModals } from "./vehicleDashboard/VehicleDashboardModals";
import type {
  VehicleDashboardTabName,
  VehicleDashboardTabParamList,
} from "./vehicleDashboard/navigationTypes";
import { getVehicleDashboardTabOptions } from "./vehicleDashboard/vehicleDashboardNativeTabOptions";

/** Set to true to show the floating action button (add service/fuel/reminder). */
const SHOW_DASHBOARD_FAB = false;

const Tab = createNativeBottomTabNavigator<VehicleDashboardTabParamList>();

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

function VehicleDashboardTabs({
  vehicleId,
  initialTab,
}: {
  vehicleId: string;
  initialTab?: VehicleDashboardTabName;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeDashboardScreenStyles(theme, insets);
  const {
    loading,
    isPremium,
    handleManageVehicle,
    handleSectionOrderPress,
    onDeleteVehicle,
    navigation,
    handleAddService,
    handleAddFuel,
    handleAddReminder,
  } = useVehicleDashboard();

  const actionsMenuItems = useMemo(
    (): SourcePickerMenuItem[] => [
      {
        id: "manage",
        label: t("dashboard.tiles.manageTitle"),
        systemImage: "gearshape",
        onPress: handleManageVehicle,
      },
      {
        id: "layout",
        label: t("dashboard.sectionOrder.menu"),
        systemImage: "rectangle.3.group",
        onPress: handleSectionOrderPress,
      },
      { id: "actions-divider", type: "divider" },
      {
        id: "delete",
        label: t("manageVehicle.deleteVehicle"),
        systemImage: "trash",
        role: "destructive",
        onPress: onDeleteVehicle,
      },
    ],
    [handleManageVehicle, handleSectionOrderPress, onDeleteVehicle, t],
  );

  const headerRight = (
    <View style={styles.headerRightActions}>
      <SourcePickerMenu items={actionsMenuItems}>
        <HeaderButton
          onPress={() => undefined}
          tintColor={theme.colors.fg}
          accessibilityLabel={undefined}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={theme.icons.headerButton}
            color={theme.colors.accent}
          />
        </HeaderButton>
      </SourcePickerMenu>
      <HeaderButton
        onPress={() => navigation.navigate("Settings")}
        tintColor={theme.colors.fg}
        accessibilityLabel={undefined}
      >
        <Settings size={theme.icons.headerButton} color={theme.colors.accent} />
      </HeaderButton>
    </View>
  );

  return (
    <HeaderLayout
      loading={loading}
      ready
      minLoadingMs={0}
      onBack={() => navigation.goBack()}
      backIcon={<Warehouse size={20} color={theme.colors.accent} />}
      showShopIcon={!isPremium}
      right={headerRight}
      paddingHorizontal={false}
    >
      <Tab.Navigator
        initialRouteName={initialTab ?? "Overview"}
        labeled
        hapticFeedbackEnabled
        scrollEdgeAppearance="transparent"
        tabBarActiveTintColor={theme.colors.accent}
        tabBarInactiveTintColor={theme.colors.muted}
        screenOptions={{
          lazy: true,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tab.Screen
          name="Menu"
          component={VehicleDashboardMenuScreen}
          initialParams={{ vehicleId }}
          options={getVehicleDashboardTabOptions("Menu", t)}
        />
        <Tab.Screen
          name="Overview"
          component={VehicleDashboardOverviewScreen}
          initialParams={{ vehicleId }}
          options={getVehicleDashboardTabOptions("Overview", t)}
        />
        <Tab.Screen
          name="Stats"
          component={VehicleDashboardStatsScreen}
          initialParams={{ vehicleId }}
          options={getVehicleDashboardTabOptions("Stats", t)}
        />
      </Tab.Navigator>

      <VehicleDashboardModals />

      {SHOW_DASHBOARD_FAB ? (
        <DashboardFab
          onAddService={handleAddService}
          onAddFuel={handleAddFuel}
          onAddReminder={handleAddReminder}
        />
      ) : null}
    </HeaderLayout>
  );
}

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { vehicleId, screen: initialTab } = route.params;

  return (
    <VehicleDashboardProvider vehicleId={vehicleId} navigation={navigation}>
      <VehicleDashboardTabs vehicleId={vehicleId} initialTab={initialTab} />
    </VehicleDashboardProvider>
  );
}
