import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

export type SourcePickerMenuActionItem = {
  id: string;
  type?: "item";
  label: string;
  systemImage?: SFSymbol;
  role?: "default" | "cancel" | "destructive";
  onPress?: () => void;
  items?: SourcePickerMenuItem[];
};

export type SourcePickerMenuDividerItem = {
  id: string;
  type: "divider";
};

export type SourcePickerMenuItem =
  | SourcePickerMenuActionItem
  | SourcePickerMenuDividerItem;

export type SourcePickerMenuProps = {
  children?: ReactNode;
  disabled?: boolean;
  items: SourcePickerMenuItem[];
  /** Ghost-style label trigger (passive View inside ContextMenu). */
  triggerLabel?: string;
  triggerStyle?: StyleProp<ViewStyle>;
};
