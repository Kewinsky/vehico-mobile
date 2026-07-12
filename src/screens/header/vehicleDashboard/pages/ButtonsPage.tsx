import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel } from "lucide-react-native";
import { Text, View } from "react-native";

import type { AppTheme } from "../../../../ui/theme";
import { Tile as TileCard } from "../../../../ui/components/common/Tile";
import { WheelsIcon } from "../../../../ui/components/icons/WheelsIcon";
import type { DashboardTile } from "../VehicleDashboardProvider";
import type { useMenuPageStyles } from "../menuPageStyles";

type MenuPageStyles = ReturnType<typeof useMenuPageStyles>;

type ButtonsPageProps = {
  windowWidth: number;
  styles: MenuPageStyles;
  theme: AppTheme;
  tiles: DashboardTile[];
  activeRemindersCount: number;
};

export function ButtonsPage({
  windowWidth,
  styles,
  theme,
  tiles,
  activeRemindersCount,
}: ButtonsPageProps) {
  const tileWidth =
    (windowWidth -
      theme.layout.contentPaddingHorizontal * 2 -
      theme.spacing.sm) /
    2;

  return (
    <View style={styles.page} collapsable={false}>
      <View style={styles.tilesWrap}>
        {tiles.map((item) => (
          <View key={item.key} style={{ width: tileWidth }}>
            <TileCard
              onPress={item.onPress}
              minHeight={110}
              style={{ width: "100%", flexGrow: 0, flexShrink: 0 }}
              title={item.title}
              icon={
                item.key === "fuel" ? (
                  <Fuel size={32} color={theme.colors.accent} />
                ) : item.key === "data" ? (
                  <Database size={32} color={theme.colors.accent} />
                ) : item.key === "wheels" ? (
                  <WheelsIcon size={48} color={theme.colors.accent} />
                ) : item.key === "reminders" ? (
                  <View style={styles.reminderTileIconWrap}>
                    <Ionicons
                      name={item.icon}
                      size={32}
                      color={theme.colors.accent}
                    />
                    {activeRemindersCount > 0 ? (
                      <View style={styles.reminderBadge}>
                        <Text style={styles.reminderBadgeText}>
                          {activeRemindersCount > 99
                            ? "99+"
                            : activeRemindersCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Ionicons
                    name={item.icon}
                    size={32}
                    color={theme.colors.accent}
                  />
                )
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
}
