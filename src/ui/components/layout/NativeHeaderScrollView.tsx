import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";

export type NativeHeaderScrollViewProps = ScrollViewProps;

export function NativeHeaderScrollView({
  contentContainerStyle,
  style,
  paddingHorizontal = true,
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
    <ScrollView
      {...rest}
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
