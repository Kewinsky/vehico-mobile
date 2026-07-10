import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  Capsule,
  GlassEffectContainer,
  Host,
  RoundedRectangle,
} from "@expo/ui/swift-ui";
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";

export type FormGlassSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  shape?: "capsule" | "rounded";
  cornerRadius?: number;
};

export function FormGlassSurface({
  style,
  shape = "rounded",
  cornerRadius = 20,
}: FormGlassSurfaceProps) {
  const { mode: themeMode } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const surfaceStyle = useMemo(
    () => [StyleSheet.absoluteFill, style],
    [style],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  if (Platform.OS === "ios") {
    const GlassShape = shape === "capsule" ? Capsule : RoundedRectangle;
    const hasSize = size.width > 0 && size.height > 0;

    return (
      <View
        style={surfaceStyle}
        pointerEvents="none"
        onLayout={handleLayout}
      >
        {hasSize ? (
          <Host
            colorScheme={themeMode === "dark" ? "dark" : "light"}
            style={{ width: size.width, height: size.height }}
          >
            <GlassEffectContainer spacing={0}>
              <GlassShape
                {...(shape === "rounded" ? { cornerRadius } : {})}
                modifiers={[
                  glassEffect({
                    glass: { variant: "regular", interactive: false },
                    shape: shape === "capsule" ? "capsule" : "rectangle",
                  }),
                  frame({ width: size.width, height: size.height }),
                ]}
              />
            </GlassEffectContainer>
          </Host>
        ) : null}
      </View>
    );
  }

  return (
    <BlurView
      intensity={themeMode === "dark" ? 45 : 70}
      tint={themeMode === "dark" ? "dark" : "light"}
      style={surfaceStyle}
      pointerEvents="none"
      onLayout={handleLayout}
    />
  );
}
