import type { StyleProp, ViewStyle } from "react-native";

export type FormGlassSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  shape?: "capsule" | "rounded";
  cornerRadius?: number;
};
