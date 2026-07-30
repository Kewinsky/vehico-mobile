import type { ComponentProps, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

export type FormDateRowProps = {
  label: string;
  /** `YYYY-MM-DD` or empty string when optional. */
  value: string;
  onChange: (ymd: string) => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  rowStyle?: ViewStyle;
  trailing?: ReactNode;
  error?: boolean;
};
