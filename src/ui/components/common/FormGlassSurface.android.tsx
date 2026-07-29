import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "../../ThemeProvider";
import type { FormGlassSurfaceProps } from "./FormGlassSurface.types";

export function FormGlassSurface({
  style,
  shape = "rounded",
  cornerRadius = 20,
}: FormGlassSurfaceProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);
  const borderRadius = shape === "capsule" ? 999 : cornerRadius;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { borderRadius },
        style,
      ]}
    >
      <BlurView
        intensity={mode === "dark" ? 28 : 40}
        tint={mode === "dark" ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, { borderRadius, overflow: "hidden" }]}
      />
    </View>
  );
}

const makeStyles = (theme: any, mode: "light" | "dark") =>
  StyleSheet.create({
    overlay: {
      backgroundColor:
        mode === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.55)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });
