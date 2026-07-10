import React from "react";
import { Animated, ScrollView, type ScrollViewProps } from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useTheme } from "../../ThemeProvider";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export type NativeHeaderScrollViewProps = ScrollViewProps;

export function NativeHeaderScrollView({
  contentContainerStyle,
  style,
  paddingHorizontal = true,
  keyboardShouldPersistTaps = "handled",
  ...rest
}: NativeHeaderScrollViewProps & { paddingHorizontal?: boolean }) {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const baseContentStyle = {
    paddingTop: headerHeight,
    paddingHorizontal: paddingHorizontal
      ? theme.layout.contentPaddingHorizontal
      : 0,
  };

  const mergedContentStyle =
    contentContainerStyle != null
      ? [baseContentStyle, contentContainerStyle]
      : baseContentStyle;

  return (
    <AnimatedScrollView
      {...rest}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      style={[
        {
          flex: 1,
          marginHorizontal: paddingHorizontal
            ? -theme.layout.contentPaddingHorizontal
            : 0,
        },
        style,
      ]}
      contentContainerStyle={mergedContentStyle}
    />
  );
}
