import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  HeaderButton,
  useFocusEffect,
  useNavigation,
} from "expo-router/react-navigation";
import { Crown, Settings, Warehouse } from "lucide-react-native";

import { routes } from "../../../core/navigation/routes";
import { useTheme } from "../../../ui/ThemeProvider";
import { useVehicleDashboard } from "./VehicleDashboardProvider";
import { VehicleDashboardActionsMenu } from "./VehicleDashboardActionsMenu";

type Props = {
  /** Overview tab: show the three-dots menu (manage / layout / delete). */
  showActionsMenu?: boolean;
};

export function VehicleDashboardHeaderToolbars({
  showActionsMenu = false,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isPremium } = useVehicleDashboard();
  const tintColor = theme.colors.accent;
  const iconSize = theme.icons.headerButton;

  const headerRightItems = useMemo(() => {
    const items = [];

    if (!isPremium) {
      items.push({
        type: "custom",
        element: (
          <HeaderButton
            onPress={() => router.push(routes.shop())}
            tintColor={tintColor}
            accessibilityLabel="Shop"
          >
            <Crown size={iconSize} color={tintColor} />
          </HeaderButton>
        ),
      });
    }

    if (showActionsMenu) {
      items.push({
        type: "custom",
        element: <VehicleDashboardActionsMenu />,
      });
    }

    items.push({
      type: "custom",
      element: (
        <HeaderButton
          onPress={() => router.push(routes.settings())}
          tintColor={tintColor}
          accessibilityLabel="Settings"
        >
          <Settings size={iconSize} color={tintColor} />
        </HeaderButton>
      ),
    });

    return items;
  }, [iconSize, isPremium, router, showActionsMenu, tintColor]);

  const headerLeftItems = useMemo(
    () => [
      {
        type: "custom",
        element: (
          <HeaderButton
            onPress={() => router.dismissTo(routes.home())}
            tintColor={tintColor}
            accessibilityLabel="Vehicles"
          >
            <Warehouse size={20} color={tintColor} />
          </HeaderButton>
        ),
      },
    ],
    [router, tintColor],
  );

  useFocusEffect(
    useCallback(() => {
      const headerNavigation = navigation.getParent() ?? navigation;
      headerNavigation.setOptions({
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackVisible: false,
        headerTitle: "",
        headerLeft: undefined,
        headerRight: undefined,
        unstable_headerLeftItems: () => headerLeftItems,
        unstable_headerRightItems: () => headerRightItems,
        headerStyle: {
          backgroundColor: "transparent",
        },
      });
    }, [headerLeftItems, headerRightItems, navigation]),
  );

  return null;
}
