import { type ReactNode, useMemo } from "react";
import { Platform, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  Host,
  Button as SwiftUIButton,
  ContextMenu as SwiftUIContextMenu,
  Divider,
} from "@expo/ui/swift-ui";

import { useTheme } from "../../ThemeProvider";
import { openAlertPicker } from "./openAlertPicker";

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

function isDividerItem(
  item: SourcePickerMenuItem,
): item is SourcePickerMenuDividerItem {
  return item.type === "divider";
}

type SourcePickerMenuProps = {
  children: ReactNode;
  disabled?: boolean;
  items: SourcePickerMenuItem[];
};

function flattenItems(items: SourcePickerMenuItem[]): SourcePickerMenuActionItem[] {
  const result: SourcePickerMenuActionItem[] = [];
  for (const item of items) {
    if (isDividerItem(item)) continue;
    if (item.items?.length) {
      result.push(...flattenItems(item.items));
      continue;
    }
    if (item.onPress) result.push(item);
  }
  return result;
}

function renderMenuItems(items: SourcePickerMenuItem[]) {
  return items.map((item) => {
    if (isDividerItem(item)) {
      return <Divider key={item.id} />;
    }

    if (item.items?.length) {
      return (
        <SwiftUIContextMenu key={item.id} activationMethod="singlePress">
          <SwiftUIContextMenu.Items>
            {renderMenuItems(item.items)}
          </SwiftUIContextMenu.Items>
          <SwiftUIContextMenu.Trigger>
            <SwiftUIButton systemImage={item.systemImage}>
              {item.label}
            </SwiftUIButton>
          </SwiftUIContextMenu.Trigger>
        </SwiftUIContextMenu>
      );
    }

    return (
      <SwiftUIButton
        key={item.id}
        systemImage={item.systemImage}
        role={item.role}
        onPress={item.onPress}
      >
        {item.label}
      </SwiftUIButton>
    );
  });
}

export function SourcePickerMenu({
  children,
  disabled = false,
  items,
}: SourcePickerMenuProps) {
  const { t } = useTranslation();
  const { mode: themeMode } = useTheme();
  const flatItems = useMemo(() => flattenItems(items), [items]);

  if (disabled) {
    return <>{children}</>;
  }

  if (Platform.OS === "ios") {
    return (
      <Host
        matchContents
        colorScheme={themeMode === "dark" ? "dark" : "light"}
      >
        <SwiftUIContextMenu activationMethod="singlePress">
          <SwiftUIContextMenu.Items>
            {renderMenuItems(items)}
          </SwiftUIContextMenu.Items>
          <SwiftUIContextMenu.Trigger>{children}</SwiftUIContextMenu.Trigger>
        </SwiftUIContextMenu>
      </Host>
    );
  }

  return (
    <Pressable
      onPress={() => {
        openAlertPicker({
          cancelLabel: t("common.cancel"),
          choices: flatItems.map((item) => ({
            label: item.label,
            onPress: item.onPress ?? (() => undefined),
          })),
        });
      }}
    >
      {children}
    </Pressable>
  );
}
