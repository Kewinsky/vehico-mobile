import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Divider, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";

import { routes } from "../../../core/navigation/routes";
import { useTheme } from "../../../ui/ThemeProvider";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

export function VehicleDashboardActionsMenu() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { vehicleId, handleSectionOrderPress, onDeleteVehicle } =
    useVehicleDashboard();
  const tintColor = theme.colors.accent;
  const iconSize = theme.icons.headerButton;

  return (
    <View style={styles.wrap}>
      <Host
        matchContents
        ignoreSafeArea="all"
        colorScheme={mode === "dark" ? "dark" : "light"}
        seedColor={tintColor}
      >
        <Menu
          modifiers={[buttonStyle("plain")]}
          label={
            <RNHostView matchContents>
              <Ionicons
                name="ellipsis-horizontal"
                size={iconSize}
                color={tintColor}
              />
            </RNHostView>
          }
        >
          <Button
            label={t("dashboard.tiles.manageTitle")}
            systemImage="car.side"
            onPress={() => router.push(routes.vehicleForm(vehicleId))}
          />
          <Button
            label={t("dashboard.sectionOrder.menu")}
            systemImage="rectangle.3.group"
            onPress={handleSectionOrderPress}
          />
          <Divider />
          <Button
            label={t("common.delete")}
            systemImage="trash"
            role="destructive"
            onPress={onDeleteVehicle}
          />
        </Menu>
      </Host>
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
