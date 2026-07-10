import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MenuView,
  type MenuAction,
  type NativeActionEvent,
} from "@expo/ui/community/menu";

import { routes } from "../../../core/navigation/routes";
import { useTheme } from "../../../ui/ThemeProvider";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

export function VehicleDashboardActionsMenu() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehicleId, handleSectionOrderPress, onDeleteVehicle } =
    useVehicleDashboard();
  const tintColor = theme.colors.accent;
  const iconSize = theme.icons.headerButton;

  const actions = useMemo((): MenuAction[] => {
    return [
      {
        id: "manage",
        title: t("dashboard.tiles.manageTitle"),
        image: "car.side",
      },
      {
        id: "layout",
        title: t("dashboard.sectionOrder.menu"),
        image: "rectangle.3.group",
      },
      {
        id: "delete-group",
        title: "",
        displayInline: true,
        subactions: [
          {
            id: "delete",
            title: t("common.delete"),
            image: "trash",
            attributes: { destructive: true },
          },
        ],
      },
    ];
  }, [t]);

  const handlePressAction = ({ nativeEvent: { event } }: NativeActionEvent) => {
    switch (event) {
      case "manage":
        router.push(routes.vehicleForm(vehicleId));
        break;
      case "layout":
        handleSectionOrderPress();
        break;
      case "delete":
        onDeleteVehicle();
        break;
    }
  };

  return (
    <View style={styles.wrap}>
      <MenuView actions={actions} onPressAction={handlePressAction}>
        <Ionicons
          name="ellipsis-horizontal"
          size={iconSize}
          color={tintColor}
        />
      </MenuView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    minWidth: 44,
    minHeight: 44,
  },
});
