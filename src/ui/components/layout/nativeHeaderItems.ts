import type {
  NativeStackHeaderItemButton,
  NativeStackHeaderItemMenu,
} from "@react-navigation/native-stack";
import type { SFSymbol } from "sf-symbols-typescript";

import type { SourcePickerMenuItem } from "../common/SourcePickerMenu.types";

export function nativeHeaderButton(
  label: string,
  systemImage: SFSymbol,
  onPress: () => void,
  options: Pick<NativeStackHeaderItemButton, "disabled" | "variant" | "tintColor"> = {},
): NativeStackHeaderItemButton {
  return {
    type: "button",
    label,
    icon: { type: "sfSymbol", name: systemImage },
    onPress,
    ...options,
  };
}

export function nativeHeaderMenu(
  label: string,
  systemImage: SFSymbol,
  items: SourcePickerMenuItem[],
  disabled = false,
): NativeStackHeaderItemMenu {
  return {
    type: "menu",
    label,
    icon: { type: "sfSymbol", name: systemImage },
    disabled,
    menu: { items: toNativeMenuItems(items) },
  };
}

function toNativeMenuItems(
  items: SourcePickerMenuItem[],
): NativeStackHeaderItemMenu["menu"]["items"] {
  type MenuItems = NativeStackHeaderItemMenu["menu"]["items"];
  const sections: MenuItems[] = [[]];

  for (const item of items) {
    const current = sections[sections.length - 1];
    if (item.type === "divider") {
      if (current.length > 0) sections.push([]);
      continue;
    }

    const icon = item.systemImage
      ? { type: "sfSymbol" as const, name: item.systemImage }
      : undefined;

    if (item.items?.length) {
      current.push({
        type: "submenu",
        label: item.label,
        icon,
        destructive: item.role === "destructive",
        items: toNativeMenuItems(item.items),
      });
    } else {
      current.push({
        type: "action",
        label: item.label,
        icon,
        destructive: item.role === "destructive",
        disabled: !item.onPress,
        onPress: () => item.onPress?.(),
      });
    }
  }

  const groups = sections.filter((section) => section.length > 0);
  if (groups.length <= 1) return groups[0] ?? [];

  return groups.map((group) => ({
    type: "submenu",
    label: "",
    inline: true,
    items: group,
  }));
}
