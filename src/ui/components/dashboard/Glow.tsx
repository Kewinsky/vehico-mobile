import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/** Three amber shades: deep → base → highlight (all derived from #FFB803). */
export type GlowColors = [string, string, string];

export type GlowVariant = "irregular" | "linear";

export type GlowIrregularOrigin = "top" | "top-right";

export type GlowIrregularPreset = "default" | "stretched";

const DEFAULT_COLORS: GlowColors = ["#C68200", "#FFB803", "#FFD25A"];

const GLOW_OPACITY = {
  light: 0.6,
  dark: 0.4,
} as const;

const DEFAULT_LINEAR_LOCATIONS: readonly [number, number, number, number] = [
  0, 0.28, 0.62, 1,
];

type BlobSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  colorIndex: 0 | 1 | 2;
  peakOpacity: number;
};

/** Asymmetric blobs from the top edge (rotated by `angle` around top center). */
const IRREGULAR_BLOBS_TOP: BlobSpec[] = [
  { cx: 0.14, cy: 0.06, rx: 0.62, ry: 0.5, colorIndex: 0, peakOpacity: 0.9 },
  { cx: 0.82, cy: 0.1, rx: 0.54, ry: 0.42, colorIndex: 1, peakOpacity: 0.72 },
  { cx: 0.38, cy: 0.24, rx: 0.7, ry: 0.55, colorIndex: 2, peakOpacity: 0.48 },
  { cx: 0.58, cy: 0.04, rx: 0.38, ry: 0.32, colorIndex: 1, peakOpacity: 0.38 },
  { cx: 0.26, cy: 0.18, rx: 0.45, ry: 0.36, colorIndex: 2, peakOpacity: 0.28 },
];

/** Taller, softer spread from the top edge (dashboard carousel). */
const IRREGULAR_BLOBS_TOP_STRETCHED: BlobSpec[] = [
  { cx: 0.14, cy: 0.1, rx: 0.62, ry: 0.72, colorIndex: 0, peakOpacity: 0.48 },
  { cx: 0.82, cy: 0.16, rx: 0.54, ry: 0.64, colorIndex: 1, peakOpacity: 0.38 },
  { cx: 0.38, cy: 0.42, rx: 0.7, ry: 0.82, colorIndex: 2, peakOpacity: 0.26 },
  { cx: 0.58, cy: 0.08, rx: 0.38, ry: 0.48, colorIndex: 1, peakOpacity: 0.22 },
  { cx: 0.26, cy: 0.32, rx: 0.45, ry: 0.58, colorIndex: 2, peakOpacity: 0.16 },
];

/** Diagonal spread from the top-right corner toward bottom-left. */
const IRREGULAR_BLOBS_TOP_RIGHT: BlobSpec[] = [
  { cx: 0.94, cy: 0.03, rx: 0.58, ry: 0.46, colorIndex: 0, peakOpacity: 0.92 },
  { cx: 0.8, cy: 0.11, rx: 0.52, ry: 0.42, colorIndex: 1, peakOpacity: 0.74 },
  { cx: 0.64, cy: 0.22, rx: 0.64, ry: 0.52, colorIndex: 2, peakOpacity: 0.5 },
  { cx: 0.88, cy: 0.16, rx: 0.4, ry: 0.34, colorIndex: 1, peakOpacity: 0.36 },
  { cx: 0.48, cy: 0.1, rx: 0.5, ry: 0.4, colorIndex: 2, peakOpacity: 0.26 },
];

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

function rotateNormPoint(
  x: number,
  y: number,
  originX: number,
  originY: number,
  degrees: number,
) {
  const rad = (degrees * Math.PI) / 180;
  const dx = x - originX;
  const dy = y - originY;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: originX + dx * cos - dy * sin,
    y: originY + dx * sin + dy * cos,
  };
}

function blobsForLayout(
  angle: number,
  origin: GlowIrregularOrigin,
  preset: GlowIrregularPreset,
): BlobSpec[] {
  const base =
    origin === "top-right"
      ? IRREGULAR_BLOBS_TOP_RIGHT
      : preset === "stretched"
        ? IRREGULAR_BLOBS_TOP_STRETCHED
        : IRREGULAR_BLOBS_TOP;
  const pivot =
    origin === "top-right" ? { x: 1, y: 0 } : { x: 0.5, y: 0 };
  const baseAngle = origin === "top-right" ? 135 : 180;
  const delta = angle - baseAngle;

  return base.map((blob) => {
    const rotated = rotateNormPoint(blob.cx, blob.cy, pivot.x, pivot.y, delta);
    return {
      ...blob,
      cx: Math.max(-0.15, Math.min(1.15, rotated.x)),
      cy: Math.max(-0.1, Math.min(0.95, rotated.y)),
    };
  });
}

type GlowProps = {
  width: number;
  height?: number;
  mode: "light" | "dark";
  colors?: GlowColors;
  /** CSS angle in degrees (0 = upward). Default 180 (linear) / 135 (top-right irregular). */
  angle?: number;
  variant?: GlowVariant;
  irregularOrigin?: GlowIrregularOrigin;
  irregularPreset?: GlowIrregularPreset;
  /** Uniform scale; top-right glow anchors at the screen corner. */
  scale?: number;
  opacity?: number;
  locations?: readonly [number, number, number, number];
  style?: StyleProp<ViewStyle>;
};

function scaleAnchorStyle(
  width: number,
  scale: number,
  irregularOrigin: GlowIrregularOrigin,
): ViewStyle | undefined {
  if (scale === 1) {
    return undefined;
  }

  if (irregularOrigin === "top-right") {
    return { left: -width * (scale - 1) };
  }

  return { left: -(width * (scale - 1)) / 2 };
}

function LinearTopGlow({
  width,
  height,
  colors,
  angle,
  opacity,
  locations = DEFAULT_LINEAR_LOCATIONS,
  style,
}: Required<
  Pick<GlowProps, "width" | "height" | "colors" | "angle" | "opacity">
> &
  Pick<GlowProps, "locations" | "style">) {
  const { start, end } = angleToGradientPoints(angle);

  return (
    <View style={[{ width, height, opacity }, style]} pointerEvents="none">
      <LinearGradient
        colors={[
          colors[0],
          colors[1],
          colors[2],
          hexToRgba(colors[2], 0),
        ]}
        locations={[...locations]}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function IrregularGlow({
  width,
  height,
  colors,
  angle,
  irregularOrigin,
  irregularPreset,
  scale,
  opacity,
  style,
}: Required<
  Pick<
    GlowProps,
    | "width"
    | "height"
    | "colors"
    | "angle"
    | "irregularOrigin"
    | "irregularPreset"
    | "scale"
    | "opacity"
  >
> &
  Pick<GlowProps, "style">) {
  const baseId = useId();
  const blobs = blobsForLayout(angle, irregularOrigin, irregularPreset);
  const renderWidth = width * scale;
  const renderHeight = height * scale;

  return (
    <View
      style={[
        { width: renderWidth, height: renderHeight, opacity },
        style,
        scaleAnchorStyle(width, scale, irregularOrigin),
      ]}
      pointerEvents="none"
    >
      <Svg width={renderWidth} height={renderHeight}>
        <Defs>
          {blobs.map((blob, index) => (
            <RadialGradient
              key={`${baseId}-grad-${index}`}
              id={`${baseId}-grad-${index}`}
              cx={renderWidth * blob.cx}
              cy={renderHeight * blob.cy}
              rx={renderWidth * blob.rx}
              ry={renderHeight * blob.ry}
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0"
                stopColor={colors[blob.colorIndex]}
                stopOpacity={blob.peakOpacity}
              />
              <Stop
                offset="0.5"
                stopColor={colors[blob.colorIndex]}
                stopOpacity={blob.peakOpacity * 0.35}
              />
              <Stop
                offset="1"
                stopColor={colors[blob.colorIndex]}
                stopOpacity={0}
              />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((blob, index) => (
          <Ellipse
            key={`${baseId}-ellipse-${index}`}
            cx={renderWidth * blob.cx}
            cy={renderHeight * blob.cy}
            rx={renderWidth * blob.rx}
            ry={renderHeight * blob.ry}
            fill={`url(#${baseId}-grad-${index})`}
          />
        ))}
      </Svg>
    </View>
  );
}

export function Glow({
  width,
  height = 340,
  mode,
  colors = DEFAULT_COLORS,
  angle,
  variant = "irregular",
  irregularOrigin = "top",
  irregularPreset = "default",
  scale = 1,
  opacity,
  locations,
  style,
}: GlowProps) {
  const resolvedOpacity = resolveGlowOpacity(mode, opacity);
  const resolvedAngle =
    angle ?? (variant === "linear" ? 180 : irregularOrigin === "top-right" ? 135 : 180);
  const shared = {
    width,
    height,
    colors,
    angle: resolvedAngle,
    opacity: resolvedOpacity,
    style,
  };

  if (variant === "linear") {
    return <LinearTopGlow {...shared} locations={locations} />;
  }

  return (
    <IrregularGlow
      {...shared}
      irregularOrigin={irregularOrigin}
      irregularPreset={irregularPreset}
      scale={scale}
    />
  );
}
