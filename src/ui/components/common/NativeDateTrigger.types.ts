import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type NativeDateTriggerProps = {
  /** `YYYY-MM-DD` or empty string when optional. */
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  onLongPress?: () => void;
  onDismiss?: () => void;
};
