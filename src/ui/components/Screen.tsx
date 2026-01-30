import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";

type ScreenProps = PropsWithChildren<{
  padding?: boolean;
}>;

export function Screen({ children, padding = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top },
        padding && styles.padded,
        { backgroundColor: theme.colors.bg },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 16,
  },
});
