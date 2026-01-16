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
}: PropsWithChildren<{ padding?: boolean; header?: ReactNode }>) {
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
