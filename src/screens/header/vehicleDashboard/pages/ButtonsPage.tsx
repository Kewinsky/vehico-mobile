import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel } from "lucide-react-native";
import { Text, View } from "react-native";

import { Tile as TileCard } from "../../../../ui/components/common/Tile";
import { WheelsIcon } from "../../../../ui/components/icons/WheelsIcon";

type DashboardTile = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type ButtonsPageProps = {
  windowWidth: number;
  styles: any;
  theme: any;
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
  return (
    <View style={[styles.page, { width: windowWidth }]}>
      <View style={styles.tilesWrap}>
        {tiles.map((item) => (
          <View key={item.key} style={styles.tileWrapper}>
            <TileCard
              onPress={item.onPress}
              minHeight={110}
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
                          {activeRemindersCount > 99 ? "99+" : activeRemindersCount}
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
