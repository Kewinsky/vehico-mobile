import Svg, { Polygon, Line } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

/**
 * Bolt type icon (for bolt/fastener style), based on provided 24x24 SVG.
 */
export function BoltTypeIcon({ size = 20, color = "#FFB803" }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityRole="image"
    >
      <Polygon
        points="22.5 10.09 22.5 11.04 16.7 11.04 4.36 22.5 1.5 22.5 1.5 19.64 12.96 7.3 12.96 1.5 13.91 1.5 22.5 10.09"
        fill="none"
        stroke={color}
        strokeMiterlimit={10}
        strokeWidth={1.91}
      />
      <Line
        x1={16.77}
        y1={7.23}
        x2={18.2}
        y2={5.8}
        stroke={color}
        strokeMiterlimit={10}
        strokeWidth={1.91}
      />
      <Line
        x1={10.09}
        y1={7.23}
        x2={13.91}
        y2={16.77}
        stroke={color}
        strokeMiterlimit={10}
        strokeWidth={1.91}
      />
      <Line
        x1={7.23}
        y1={10.09}
        x2={11.05}
        y2={19.64}
        stroke={color}
        strokeMiterlimit={10}
        strokeWidth={1.91}
      />
      <Line
        x1={4.36}
        y1={12.95}
        x2={8.18}
        y2={22.5}
        stroke={color}
        strokeMiterlimit={10}
        strokeWidth={1.91}
      />
    </Svg>
  );
}
