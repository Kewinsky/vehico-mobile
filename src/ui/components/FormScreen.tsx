import type { PropsWithChildren, ReactNode } from "react";
import {
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";

export function FormScreen({
  children,
  padding = true,
  header,
  scrollEnabled = true,
}: PropsWithChildren<{ padding?: boolean; header?: ReactNode; scrollEnabled?: boolean }>) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: insets.top,
      }}
    >
      {header}
      <ScrollView
        scrollEnabled={scrollEnabled}
        nestedScrollEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: padding ? theme.spacing.md : 0,
          paddingBottom: insets.bottom + theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>{children}</View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
}
