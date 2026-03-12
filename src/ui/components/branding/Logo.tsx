import React from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type Props = { width?: number; height?: number };

/**
 * Vehico logo (SVG from assets/logo.svg). Use for hero, onboarding, etc.
 */
export function Logo({ width = 64, height = 64 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient
          id="paint0_linear_5_62"
          x1="39"
          y1="8"
          x2="52"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.192308" stopColor="#FFB803" />
          <Stop offset="0.745192" stopColor="#996E02" />
        </LinearGradient>
        <LinearGradient
          id="paint1_linear_5_62"
          x1="31.5825"
          y1="48.1856"
          x2="19.4175"
          y2="20.8144"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#996E02" />
          <Stop offset="1" stopColor="#FFB803" />
        </LinearGradient>
        <ClipPath id="clip0_5_62">
          <Rect width="64" height="64" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip0_5_62)">
        <Circle
          cx="46"
          cy="21"
          r="9"
          fill="url(#paint0_linear_5_62)"
        />
        <Path
          d="M19 21L32 48"
          stroke="url(#paint1_linear_5_62)"
          strokeWidth="18"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
