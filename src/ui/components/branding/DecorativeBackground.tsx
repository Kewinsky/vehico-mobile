import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "../common/ChoiceChip";

type Props = {
  variant?: "onboarding" | "landing";
};

export function DecorativeBackground({ variant = "onboarding" }: Props) {
  const { theme, mode } = useTheme();
  const styles = useMemo(
    () => makeStyles(theme, mode, variant),
    [theme, mode, variant],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={[
          hexToRgba(theme.colors.accent, mode === "dark" ? 0.08 : 0.12),
          "transparent",
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 1 }}
        style={styles.sideGlow}
      />
      <View style={styles.ringOne} />
      <View style={styles.ringTwo} />
      <View style={styles.softBlobOne} />
      <View style={styles.softBlobTwo} />
    </View>
  );
}

const makeStyles = (
  theme: any,
  mode: "light" | "dark",
  variant: "onboarding" | "landing",
) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
    },
    topGlow: {
      position: "absolute",
      top: variant === "landing" ? -110 : -80,
      left: -50,
      right: -50,
      height: variant === "landing" ? 300 : 260,
      borderBottomLeftRadius: 160,
      borderBottomRightRadius: 160,
    },
    sideGlow: {
      position: "absolute",
      right: -120,
      top: variant === "landing" ? 140 : 180,
      width: 320,
      height: 320,
      borderRadius: 320,
    },
    ringOne: {
      position: "absolute",
      top: variant === "landing" ? 72 : 96,
      right: -36,
      width: 188,
      height: 188,
      borderRadius: 188,
      borderWidth: 1,
      borderColor: hexToRgba(
        theme.colors.accent,
        mode === "dark" ? 0.18 : 0.14,
      ),
    },
    ringTwo: {
      position: "absolute",
      bottom: variant === "landing" ? 180 : 120,
      left: -76,
      width: 210,
      height: 210,
      borderRadius: 210,
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.fg, mode === "dark" ? 0.08 : 0.05),
    },
    softBlobOne: {
      position: "absolute",
      top: variant === "landing" ? 124 : 156,
      left: -28,
      width: 120,
      height: 120,
      borderRadius: 120,
      backgroundColor: hexToRgba(
        theme.colors.accent,
        mode === "dark" ? 0.08 : 0.1,
      ),
    },
    softBlobTwo: {
      position: "absolute",
      bottom: variant === "landing" ? 84 : 56,
      right: 24,
      width: 88,
      height: 88,
      borderRadius: 88,
      backgroundColor: hexToRgba(
        theme.colors.fg,
        mode === "dark" ? 0.04 : 0.03,
      ),
    },
  });
