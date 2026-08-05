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
  muted?: boolean;
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
  const tileWidth =
    (windowWidth -
      theme.layout.contentPaddingHorizontal * 2 -
      theme.spacing.sm) /
    2;

  return (
    <View style={[styles.page, { width: windowWidth }]}>
      <View style={styles.tilesWrap}>
        {tiles.map((item) => {
          const iconColor = item.muted
            ? theme.colors.muted
            : theme.colors.accent;
          return (
            <View
              key={item.key}
              style={[styles.tileWrapper, { width: tileWidth }]}
            >
              <TileCard
                onPress={item.onPress}
                minHeight={110}
                title={item.title}
                titleColor={item.muted ? theme.colors.muted : undefined}
                style={item.muted ? { opacity: 0.55 } : undefined}
                icon={
                  item.key === "fuel" ? (
                    <Fuel size={32} color={iconColor} />
                  ) : item.key === "data" ? (
                    <Database size={32} color={iconColor} />
                  ) : item.key === "wheels" ? (
                    <WheelsIcon size={48} color={iconColor} />
                  ) : item.key === "reminders" ? (
                    <View style={styles.reminderTileIconWrap}>
                      <Ionicons name={item.icon} size={32} color={iconColor} />
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
                    <Ionicons name={item.icon} size={32} color={iconColor} />
                  )
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
