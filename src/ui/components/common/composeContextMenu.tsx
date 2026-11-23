import {
  cloneElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  DropdownMenu,
  DropdownMenuItem,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";

import type { AppTheme } from "../../theme";
import { useTheme } from "../../ThemeProvider";
import type { SourcePickerMenuItem } from "./SourcePickerMenu.types";

type ComposeMenuElement = ReactElement<ComponentProps<typeof DropdownMenuItem>>;

function isDividerItem(
  item: SourcePickerMenuItem,
): item is { id: string; type: "divider" } {
  return item.type === "divider";
}

function menuItemColors(theme: AppTheme, destructive = false) {
  return {
    textColor: destructive ? theme.colors.danger : theme.colors.fg,
  };
}

export function renderComposeSourcePickerItems(
  items: SourcePickerMenuItem[],
  theme: AppTheme,
): ComposeMenuElement[] {
  const elements: ComposeMenuElement[] = [];

  for (const item of items) {
    if (isDividerItem(item)) continue;

    // Android dropdown menus have no nested menu: flatten submenus instead.
    if (item.items?.length) {
      elements.push(...renderComposeSourcePickerItems(item.items, theme));
      continue;
    }

    const destructive = item.role === "destructive";

    elements.push(
      <DropdownMenuItem
        key={item.id}
        onClick={item.onPress}
        elementColors={menuItemColors(theme, destructive)}
      >
        <DropdownMenuItem.Text>
          <ComposeText>{item.label}</ComposeText>
        </DropdownMenuItem.Text>
      </DropdownMenuItem>,
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

export function ComposeMenu({
  items,
  trigger,
  disabled = false,
  menuColor,
  style,
}: ComposeMenuProps) {
  const { theme, mode } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const resolvedMenuColor = menuColor ?? theme.colors.card;
  const menuItems = Array.isArray(items) ? items : [items];

  if (disabled) {
    return <>{trigger}</>;
  }

  return (
    <View style={[styles.host, style]}>
      <DropdownMenu
        key={mode}
        style={styles.menuLayer}
        color={resolvedMenuColor}
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <DropdownMenu.Items>
          {menuItems.map((item) =>
            cloneElement(item, {
              onClick: () => {
                setExpanded(false);
                item.props.onClick?.();
              },
            }),
          )}
        </DropdownMenu.Items>
      </DropdownMenu>
      <Pressable
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        hitSlop={4}
      >
        <View pointerEvents="none">{trigger}</View>
      </Pressable>
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
        <DropdownMenuItem
          key={`${option}-${index}`}
          onClick={() => onSelect(index)}
          elementColors={colors}
        >
          <DropdownMenuItem.Text>
            <ComposeText>{option}</ComposeText>
          </DropdownMenuItem.Text>
        </DropdownMenuItem>
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
    ...StyleSheet.absoluteFill,
  },
});
