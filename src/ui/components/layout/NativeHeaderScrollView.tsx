import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";

export type NativeHeaderScrollViewProps = ScrollViewProps;

export function NativeHeaderScrollView({
  contentContainerStyle,
  style,
  ...rest
}: NativeHeaderScrollViewProps) {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const baseContentStyle = {
    paddingTop: headerHeight,
    paddingHorizontal: theme.layout.contentPaddingHorizontal,
  };

  const mergedContentStyle =
    contentContainerStyle != null
      ? [baseContentStyle, contentContainerStyle]
      : baseContentStyle;

  return (
    <ScrollView
      {...rest}
      showsVerticalScrollIndicator={false}
      style={[
        {
          flex: 1,
          marginHorizontal: -theme.layout.contentPaddingHorizontal,
        },
        style,
      ]}
      contentContainerStyle={mergedContentStyle}
    />
  );
}
