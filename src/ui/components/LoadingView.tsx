import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../ThemeProvider";
import { LoadingIndicator } from "./LoadingIndicator";

type LoadingViewProps = {
  /** Apply horizontal content padding (from theme). Default true. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Full-area centered loading state. Use for screen/section loading. */
export function LoadingView({ padded = true, style }: LoadingViewProps) {
  const { theme } = useTheme();
  const containerStyle = [styles.container, style];

  return (
    <View style={containerStyle}>
      <LoadingIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
