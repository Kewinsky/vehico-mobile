import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/** Linear gradient color pair: start → end. */
export type GlowColors = [string, string];

export type GlowVariant = "linear" | "radial";

const DEFAULT_COLORS: GlowColors = ["#ff5f6d", "#FFB803"];

const GLOW_OPACITY = {
  light: 0.6,
  dark: 0.4,
} as const;

function resolveGlowOpacity(mode: "light" | "dark", override?: number) {
  return override ?? GLOW_OPACITY[mode];
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** CSS angle in degrees (0 = upward, 90 = right). */
export function angleToGradientPoints(degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  const x = Math.cos(rad) * 0.5;
  const y = Math.sin(rad) * 0.5;
  return {
    start: { x: 0.5 - x, y: 0.5 - y },
    end: { x: 0.5 + x, y: 0.5 + y },
  };
}

/** Map angle to radial origin (fractions of width / height). */
export function angleToRadialOrigin(degrees: number) {
  if (degrees === 225) {
    return { cx: 0, cy: 0, rx: 1.15, ry: 1.05 };
  }

  const offset = ((degrees - 180) * Math.PI) / 180;
  return {
    cx: 0.5 - Math.sin(offset) * 0.45,
    cy: 0,
    rx: 1.05,
    ry: 0.95,
  };
}

type GlowProps = {
  width: number;
  height?: number;
  mode: "light" | "dark";
  colors?: GlowColors;
  /** CSS angle in degrees (0 = upward). Default 180 (top → bottom, linear). */
  angle?: number;
  variant?: GlowVariant;
  /** Override `GLOW_OPACITY` for this instance. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

function LinearTopGlow({
  width,
  height,
  colors,
  angle,
  opacity,
  style,
}: Required<
  Pick<GlowProps, "width" | "height" | "colors" | "angle" | "opacity">
> &
  Pick<GlowProps, "style">) {
  const { start, end } = angleToGradientPoints(angle);

  return (
    <View style={[{ width, height, opacity }, style]} pointerEvents="none">
      <LinearGradient
        colors={[
          colors[0],
          colors[1],
          hexToRgba(colors[1], 0.45),
          hexToRgba(colors[1], 0),
        ]}
        locations={[0, 0.28, 0.62, 1]}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function RadialAngledGlow({
  width,
  height,
  colors,
  angle,
  opacity,
  style,
}: Required<
  Pick<GlowProps, "width" | "height" | "colors" | "angle" | "opacity">
> &
  Pick<GlowProps, "style">) {
  const gradientId = useId();
  const origin = angleToRadialOrigin(angle);

  return (
    <View style={[{ width, height, opacity }, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient
            id={gradientId}
            cx={width * origin.cx}
            cy={height * origin.cy}
            rx={width * origin.rx}
            ry={height * origin.ry}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors[0]} stopOpacity={1} />
            <Stop offset="0.45" stopColor={colors[1]} stopOpacity={0.65} />
            <Stop offset="1" stopColor={colors[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width * origin.cx}
          cy={height * origin.cy}
          rx={width * origin.rx}
          ry={height * origin.ry}
          fill={`url(#${gradientId})`}
        />
      </Svg>
    </View>
  );
}

/** Top-edge glow: linear or radial based on `variant` (defaults: 180° = linear). */
export function Glow({
  width,
  height = 340,
  mode,
  colors = DEFAULT_COLORS,
  angle = 180,
  variant,
  opacity,
  style,
}: GlowProps) {
  const resolvedOpacity = resolveGlowOpacity(mode, opacity);
  const props = {
    width,
    height,
    colors,
    angle,
    opacity: resolvedOpacity,
    style,
  };
  const useLinear = variant === "linear" || (variant == null && angle === 180);

  if (useLinear) {
    return <LinearTopGlow {...props} />;
  }

  return <RadialAngledGlow {...props} />;
}
