import type { FC } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type IOSMenuPickerControlProps = {
  displayText: string;
  valueColor: string;
  options: readonly string[];
  onSelect: (index: number) => void;
  colorScheme: "light" | "dark";
  wrapStyle?: StyleProp<ViewStyle>;
  hostStyle?: StyleProp<ViewStyle>;
};

export const IOSMenuPickerControl: FC<IOSMenuPickerControlProps> = () => null;
