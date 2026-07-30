import type { ComponentProps, ReactElement, ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Button, ContextMenu } from "@expo/ui/jetpack-compose";

import type { AppTheme } from "../../theme";
import { useTheme } from "../../ThemeProvider";
import type { SourcePickerMenuItem } from "./SourcePickerMenu.types";

type ComposeMenuElement = ReactElement<ComponentProps<typeof Button>>;

function isDividerItem(
  item: SourcePickerMenuItem,
): item is { id: string; type: "divider" } {
  return item.type === "divider";
}

function menuItemColors(theme: AppTheme, destructive = false) {
  return {
    contentColor: destructive ? theme.colors.danger : theme.colors.fg,
    // Transparent so the DropdownMenu container color shows through.
    containerColor: "#00000000",
  };
}

export function renderComposeSourcePickerItems(
  items: SourcePickerMenuItem[],
  theme: AppTheme,
): ComposeMenuElement[] {
  const elements: ComposeMenuElement[] = [];

  for (const item of items) {
    if (isDividerItem(item)) continue;

    // Android ContextMenu has no real nested menu: Submenu becomes a section
    // title + divider (awkward for Documents "+" etc.). Flatten instead.
    if (item.items?.length) {
      elements.push(...renderComposeSourcePickerItems(item.items, theme));
      continue;
    }

    const destructive = item.role === "destructive";

    elements.push(
      <Button
        key={item.id}
        variant="borderless"
        onPress={item.onPress}
        elementColors={menuItemColors(theme, destructive)}
      >
        {item.label}
      </Button>,
    );
  }

  return elements;
}

type ComposeMenuProps = {
  items: ComposeMenuElement | ComposeMenuElement[];
  trigger: ReactNode;
  disabled?: boolean;
  menuColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compose ContextMenu cannot render RN children as its trigger on Android,
 * so the visible trigger is plain RN content and an invisible full-size
 * ContextMenu layer on top of it receives the tap.
 */
export function ComposeMenu({
  items,
  trigger,
  disabled = false,
  menuColor,
  style,
}: ComposeMenuProps) {
  const { theme, mode } = useTheme();
  const resolvedMenuColor = menuColor ?? theme.colors.card;

  if (disabled) {
    return <>{trigger}</>;
  }

  return (
    <View style={[styles.host, style]}>
      <View pointerEvents="none">{trigger}</View>
      <View style={styles.menuLayer}>
        {/* Remount on theme so native DropdownMenu item colors refresh. */}
        <ContextMenu key={mode} style={styles.menu} color={resolvedMenuColor}>
          <ContextMenu.Items>{items}</ContextMenu.Items>
          <ContextMenu.Trigger>
            <View style={styles.tapTarget} />
          </ContextMenu.Trigger>
        </ContextMenu>
      </View>
    </View>
  );
}

type ComposeOptionMenuProps = {
  options: readonly string[];
  onSelect: (index: number) => void;
  trigger: ReactNode;
  disabled?: boolean;
  menuColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function ComposeOptionMenu({
  options,
  onSelect,
  style,
  ...rest
}: ComposeOptionMenuProps) {
  const { theme } = useTheme();
  const colors = menuItemColors(theme);

  return (
    <ComposeMenu
      style={[styles.stretch, style]}
      items={options.map((option, index) => (
        <Button
          key={`${option}-${index}`}
          variant="borderless"
          onPress={() => onSelect(index)}
          elementColors={colors}
        >
          {option}
        </Button>
      ))}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    position: "relative",
  },
  stretch: {
    alignSelf: "stretch",
    minWidth: 0,
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  menu: {
    flex: 1,
  },
  tapTarget: {
    flex: 1,
  },
});
