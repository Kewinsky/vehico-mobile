import { View } from "react-native";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";

export function DashboardBottomInset() {
  const tabBarHeight = useBottomTabBarHeight();

  return <View style={{ height: tabBarHeight }} />;
}
