import { useMemo } from "react";
import { View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { type NavigationProp, type ParamListBase, HeaderButton } from "expo-router/react-navigation";
import { Ionicons } from "@expo/vector-icons";
import { Crown, Settings, Warehouse } from "lucide-react-native";

import { routes } from "../../../core/navigation/routes";
import { useNativeHeaderAsAppNavbar } from "../../../ui/components/layout/AppNavbar";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

/** Native stack header for all vehicle dashboard native tabs (menu / overview / statistics). */
export function useVehicleDashboardHeader() {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, isPremium, openActions, vehicle } = useVehicleDashboard();

  const title = vehicle ? `${vehicle.make} ${vehicle.model}`.trim() : "";

  const headerRight = useMemo(
    () => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
        }}
      >
        {isPremium ? null : (
          <HeaderButton
            onPress={() => router.push(routes.shop())}
            tintColor={theme.colors.accent}
            accessibilityLabel={undefined}
          >
            <Crown size={theme.icons.headerButton} color={theme.colors.accent} />
          </HeaderButton>
        )}
        <HeaderButton
          onPress={openActions}
          tintColor={theme.colors.accent}
          accessibilityLabel={undefined}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={theme.icons.headerButton}
            color={theme.colors.accent}
          />
        </HeaderButton>
        <HeaderButton
          onPress={() => router.push(routes.settings())}
          tintColor={theme.colors.accent}
          accessibilityLabel={undefined}
        >
          <Settings size={theme.icons.headerButton} color={theme.colors.accent} />
        </HeaderButton>
      </View>
    ),
    [
      isPremium,
      openActions,
      router,
      theme.colors.accent,
      theme.icons.headerButton,
      theme.spacing.xs,
    ],
  );

  const headerNavigation = navigation.getParent() ?? navigation;

  useNativeHeaderAsAppNavbar({
    navigation: headerNavigation as NavigationProp<ParamListBase>,
    title,
    onBack: () => router.back(),
    backIcon: <Warehouse size={20} color={theme.colors.accent} />,
    right: headerRight,
  });
}
