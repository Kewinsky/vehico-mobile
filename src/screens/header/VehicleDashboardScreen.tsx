import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { Settings, Warehouse } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { DashboardFab } from "../../ui/components/common/DashboardFab";
import { useTheme } from "../../ui/ThemeProvider";
import { VehicleDashboardTabBar } from "./vehicleDashboard/components/VehicleDashboardTabBar";
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

/** Set to true to show the floating action button (add service/fuel/reminder). */
const SHOW_DASHBOARD_FAB = false;

const Tab = createBottomTabNavigator<VehicleDashboardTabParamList>();

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

function VehicleDashboardTabs({
  vehicleId,
  initialTab,
}: {
  vehicleId: string;
  initialTab?: VehicleDashboardTabName;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeDashboardScreenStyles(theme, insets);
  const {
    loading,
    isPremium,
    openActions,
    navigation,
    handleAddService,
    handleAddFuel,
    handleAddReminder,
  } = useVehicleDashboard();

  const headerRight = (
    <View style={styles.headerRightActions}>
      <HeaderButton
        onPress={openActions}
        tintColor={theme.colors.fg}
        accessibilityLabel={undefined}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={theme.icons.headerButton}
          color={theme.colors.accent}
        />
      </HeaderButton>
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
        tabBar={(props) => <VehicleDashboardTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tab.Screen
          name="Menu"
          component={VehicleDashboardMenuScreen}
          initialParams={{ vehicleId }}
        />
        <Tab.Screen
          name="Overview"
          component={VehicleDashboardOverviewScreen}
          initialParams={{ vehicleId }}
        />
        <Tab.Screen
          name="Stats"
          component={VehicleDashboardStatsScreen}
          initialParams={{ vehicleId }}
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
