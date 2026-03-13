import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

export type NativeHeaderScrollViewProps = ScrollViewProps;

export function NativeHeaderScrollView({
  contentContainerStyle,
  style,
  ...rest
}: NativeHeaderScrollViewProps) {
  const headerHeight = useHeaderHeight();

  const mergedContentStyle =
    contentContainerStyle != null
      ? [{ paddingTop: headerHeight }, contentContainerStyle]
      : { paddingTop: headerHeight };

  return (
    <ScrollView
      {...rest}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={mergedContentStyle}
    />
  );
}

