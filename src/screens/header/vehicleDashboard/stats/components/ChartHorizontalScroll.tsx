import type { ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";

type ChartHorizontalScrollProps = {
  contentWidth: number;
  viewportWidth: number;
  maxHeight: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Horizontal chart scroller with a fixed viewport width so the native scroll
 * layer cannot expand its touch target to the full content width and block
 * taps on the rest of the screen.
 */
export function ChartHorizontalScroll({
  contentWidth,
  viewportWidth,
  maxHeight,
  contentContainerStyle,
  style,
  children,
}: ChartHorizontalScrollProps) {
  const needsHorizontalScroll = contentWidth > viewportWidth + 1;
  const viewportStyle: ViewStyle = {
    width: viewportWidth,
    maxHeight,
    overflow: "hidden",
  };

  if (!needsHorizontalScroll) {
    return (
      <View style={[viewportStyle, style]} collapsable={false}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      bounces={false}
      nestedScrollEnabled
      scrollEnabled
      showsHorizontalScrollIndicator
      style={[viewportStyle, style]}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
}
