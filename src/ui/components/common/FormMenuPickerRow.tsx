import type { ComponentProps, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

export type FormMenuPickerRowProps = {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  options: string[];
  selectedIndex: number;
  onOptionSelected: (index: number) => void;
  isValueMuted?: boolean;
  error?: boolean;
  disabled?: boolean;
  rowStyle?: ViewStyle;
};

export function FormMenuPickerRow(_props: FormMenuPickerRowProps): null {
  return null;
}
