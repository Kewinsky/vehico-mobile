import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  /** Color for the bolt-hole circles; defaults to black for contrast on light backgrounds. */
  dotColor?: string;
};

/**
 * ET (Einpress Tiefe / offset) icon for wheel rim.
 * Based on et-light.svg / et-dark.svg; main shape uses color, hole circles use dotColor.
 */
export function EtOffsetIcon({
  size = 20,
  color = "#FFB803",
  dotColor = "#000",
}: Props) {
  const h = size * (20 / 24);
  return (
    <Svg
      width={size}
      height={h}
      viewBox="0 0 24 20"
      fill="none"
      accessibilityRole="image"
    >
      <Path
        d="M0 2C0 0.895431 0.895431 0 2 0H3V20H2C0.895431 20 0 19.1046 0 18V2Z"
        fill={color}
      />
      <Path
        d="M3 0H8.5C9.32843 0 10 0.671573 10 1.5V1.5C10 2.32843 9.32843 3 8.5 3H3V0Z"
        fill={color}
      />
      <Rect x="3" y="3" width="1" height="1" fill={color} />
      <Circle cx="4" cy="4" r="1" fill={dotColor} />
      <Path
        d="M3 8H7.5C8.32843 8 9 8.67157 9 9.5V9.5C9 10.3284 8.32843 11 7.5 11H3V8Z"
        fill={color}
      />
      <Rect x="3" y="11" width="1" height="1" fill={color} />
      <Circle cx="4" cy="12" r="1" fill={dotColor} />
      <Rect x="3" y="8" width="1" height="1" transform="rotate(-90 3 8)" fill={color} />
      <Circle cx="4" cy="7" r="1" transform="rotate(-90 4 7)" fill={dotColor} />
      <Path
        d="M3 17H8.5C9.32843 17 10 17.6716 10 18.5V18.5C10 19.3284 9.32843 20 8.5 20H3V17Z"
        fill={color}
      />
      <Rect x="3" y="17" width="1" height="1" transform="rotate(-90 3 17)" fill={color} />
      <Circle cx="4" cy="16" r="1" transform="rotate(-90 4 16)" fill={dotColor} />
      <Rect x="11" y="0" width="13" height="3" rx="1.5" fill={color} />
      <Path
        d="M16 3H19V18.5C19 19.3284 18.3284 20 17.5 20V20C16.6716 20 16 19.3284 16 18.5V3Z"
        fill={color}
      />
      <Rect x="19" y="3" width="1" height="1" fill={color} />
      <Circle cx="20" cy="4" r="1" fill={dotColor} />
      <Rect width="1" height="1" transform="matrix(-1 0 0 1 16 3)" fill={color} />
      <Circle
        cx="1"
        cy="1"
        r="1"
        fill={dotColor}
        transform="matrix(-1 0 0 1 16 3)"
      />
    </Svg>
  );
}
