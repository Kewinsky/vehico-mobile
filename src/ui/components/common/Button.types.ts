import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "destructive" | "outlined";
  /** Primary/outlined fill and border; defaults to theme accent. */
  color?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}>;
