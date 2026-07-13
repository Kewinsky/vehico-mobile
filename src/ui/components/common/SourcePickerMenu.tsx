import { type ReactNode, useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  Host,
  Button as SwiftUIButton,
  ContextMenu as SwiftUIContextMenu,
  Divider,
} from "@expo/ui/swift-ui";

import { useTheme } from "../../ThemeProvider";
import { Button } from "./Button";
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
  children?: ReactNode;
  disabled?: boolean;
  items: SourcePickerMenuItem[];
  /** Ghost-style label trigger (iOS: passive View inside ContextMenu). */
  triggerLabel?: string;
  triggerStyle?: StyleProp<ViewStyle>;
};

function makeGhostTriggerStyles(theme: { spacing: any; radius: any; typography: any; colors: any }) {
  return StyleSheet.create({
    ghost: {
      height: theme.spacing.lg * 2,
      borderRadius: theme.radius.xl,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "stretch",
      width: "100%",
      backgroundColor: theme.colors.card,
      borderWidth: 0,
    },
    text: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
      color: theme.colors.fg,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}

function GhostMenuTrigger({
  label,
  disabled,
  style,
}: {
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeGhostTriggerStyles(theme), [theme]);

  return (
    <View style={[styles.ghost, disabled && styles.disabled, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

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
  triggerLabel,
  triggerStyle,
}: SourcePickerMenuProps) {
  const { t } = useTranslation();
  const { mode: themeMode } = useTheme();
  const flatItems = useMemo(() => flattenItems(items), [items]);

  const openMenu = () => {
    openAlertPicker({
      cancelLabel: t("common.cancel"),
      choices: flatItems.map((item) => ({
        label: item.label,
        onPress: item.onPress ?? (() => undefined),
      })),
    });
  };

  if (triggerLabel) {
    if (disabled) {
      return (
        <GhostMenuTrigger
          label={triggerLabel}
          disabled
          style={triggerStyle}
        />
      );
    }

    if (Platform.OS === "ios") {
      return (
        <View style={{ alignSelf: "stretch", width: "100%" }}>
          <Host
            matchContents
            colorScheme={themeMode === "dark" ? "dark" : "light"}
          >
            <SwiftUIContextMenu activationMethod="singlePress">
              <SwiftUIContextMenu.Items>
                {renderMenuItems(items)}
              </SwiftUIContextMenu.Items>
              <SwiftUIContextMenu.Trigger>
                <GhostMenuTrigger label={triggerLabel} style={triggerStyle} />
              </SwiftUIContextMenu.Trigger>
            </SwiftUIContextMenu>
          </Host>
        </View>
      );
    }

    return (
      <Button onPress={openMenu} variant="ghost" style={triggerStyle}>
        {triggerLabel}
      </Button>
    );
  }

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
    <Pressable onPress={openMenu}>{children}</Pressable>
  );
}
