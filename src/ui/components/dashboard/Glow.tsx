import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/** Three-tone palette distributed across a single gradient. */
export type GlowPalette = [string, string, string];

/** Origin + spread of the radial gradient, as fractions of width / height. */
export type GlowShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

/**
 * A few gradient "angles": same smooth radial wash, anchored from different
 * spots so each section/screen reads slightly differently.
 */
export const GLOW_SHAPES: GlowShape[] = [
  { cx: 0.1, cy: 0.04, rx: 1.05, ry: 1.0 }, // top-left
  { cx: 0.5, cy: 0.0, rx: 0.9, ry: 0.95 }, // top-center
  { cx: 0.9, cy: 0.04, rx: 1.05, ry: 1.0 }, // top-right
  { cx: 0.5, cy: 0.12, rx: 1.1, ry: 0.85 }, // wide top
];

const DEFAULT_PALETTE: GlowPalette = ["#FFB803", "#FF8A00", "#FFC93C"];

type GlowProps = {
  width: number;
  height?: number;
  mode: "light" | "dark";
  /** Three colors distributed across the gradient. */
  colors?: GlowPalette;
  /** Gradient origin/spread. Defaults to top-center. */
  shape?: GlowShape;
  style?: StyleProp<ViewStyle>;
};

/** Smooth radial gradient glow, fading from `shape` origin to transparent. */
export function Glow({
  width,
  height = 340,
  mode,
  colors = DEFAULT_PALETTE,
  shape = GLOW_SHAPES[0],
  style,
}: GlowProps) {
  const gradientId = useId();
  const globalOpacity = mode === "dark" ? 0.55 : 0.38;

  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Svg width={width} height={height} opacity={globalOpacity}>
        <Defs>
          <RadialGradient
            id={gradientId}
            cx={width * shape.cx}
            cy={height * shape.cy}
            rx={width * shape.rx}
            ry={height * shape.ry}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors[0]} stopOpacity={1} />
            <Stop offset="0.35" stopColor={colors[1]} stopOpacity={0.6} />
            <Stop offset="0.7" stopColor={colors[2]} stopOpacity={0.25} />
            <Stop offset="1" stopColor={colors[2]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width * shape.cx}
          cy={height * shape.cy}
          rx={width * shape.rx}
          ry={height * shape.ry}
          fill={`url(#${gradientId})`}
        />
      </Svg>
    </View>
  );
}

type GlowLayerProps = {
  index: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
  mode: "light" | "dark";
  colors: GlowPalette;
  shape: GlowShape;
};

function GlowLayer({
  index,
  progress,
  width,
  height,
  mode,
  colors,
  shape,
}: GlowLayerProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(progress.value - index)),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedStyle]}
      pointerEvents="none"
    >
      <Glow
        width={width}
        height={height}
        mode={mode}
        colors={colors}
        shape={shape}
      />
    </Animated.View>
  );
}

type GlowStackProps = {
  width: number;
  height?: number;
  mode: "light" | "dark";
  /** Drives which layer is visible (typically the pager progress 0..n). */
  progress: SharedValue<number>;
  /** One palette per section; cross-faded based on `progress`. */
  palettes: GlowPalette[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Stacks one gradient glow per section and cross-fades between them as
 * `progress` moves. Each section also gets a different gradient angle.
 */
export function GlowStack({
  width,
  height = 340,
  mode,
  progress,
  palettes,
  style,
}: GlowStackProps) {
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      {palettes.map((colors, index) => (
        <GlowLayer
          key={`glow-${index}`}
          index={index}
          progress={progress}
          width={width}
          height={height}
          mode={mode}
          colors={colors}
          shape={GLOW_SHAPES[index % GLOW_SHAPES.length]}
        />
      ))}
    </View>
  );
}
