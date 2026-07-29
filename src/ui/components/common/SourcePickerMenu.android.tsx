import { Children, isValidElement, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, ContextMenu } from "@expo/ui/jetpack-compose";

import { useTheme } from "../../ThemeProvider";
import {
  ComposeMenu,
  renderComposeSourcePickerItems,
} from "./composeContextMenu";
import type { SourcePickerMenuProps } from "./SourcePickerMenu.types";

export type {
  SourcePickerMenuActionItem,
  SourcePickerMenuDividerItem,
  SourcePickerMenuItem,
} from "./SourcePickerMenu.types";

const BUTTON_SIZE = 40;

/** Prefer the icon inside HeaderIconButton; otherwise use children as-is. */
function resolveIcon(children: ReactNode): ReactNode {
  if (children == null) return null;
  try {
    const child = Children.only(children);
    if (isValidElement(child)) {
      const inner = (child.props as { children?: ReactNode }).children;
      if (inner != null) return inner;
    }
    return child;
  } catch {
    return children;
  }
}

export function SourcePickerMenu({
  children,
  disabled = false,
  items,
  triggerLabel,
  triggerStyle,
}: SourcePickerMenuProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const menuItems = useMemo(
    () => renderComposeSourcePickerItems(items, theme),
    [items, theme],
  );
  const icon = resolveIcon(children);

  if (triggerLabel) {
    const ghost = (
      <View style={[styles.ghost, triggerStyle, disabled && styles.disabled]}>
        <Text style={styles.ghostText}>{triggerLabel}</Text>
      </View>
    );

    return (
      <ComposeMenu
        items={menuItems}
        trigger={ghost}
        disabled={disabled}
        menuColor={theme.colors.card}
        style={styles.stretch}
      />
    );
  }

  if (disabled) {
    return <View style={[styles.surface, styles.disabled]}>{icon}</View>;
  }

  return (
    <View style={styles.surface}>
      <ContextMenu style={styles.menu} color={theme.colors.card}>
        <ContextMenu.Items>{menuItems}</ContextMenu.Items>
        <ContextMenu.Trigger>
          {/* Native Compose button: Material ripple + opens the menu */}
          <Button
            variant="borderless"
            style={styles.hit}
            elementColors={{
              containerColor: "#00000000",
              contentColor: theme.colors.accent,
            }}
          >
            {""}
          </Button>
        </ContextMenu.Trigger>
      </ContextMenu>
      <View style={styles.iconOverlay} pointerEvents="none">
        {icon}
      </View>
    </View>
  );
}

function makeStyles(theme: {
  spacing: any;
  radius: any;
  typography: any;
  colors: { card: string; border: string; fg: string; accent: string };
}) {
  return StyleSheet.create({
    stretch: {
      alignSelf: "stretch",
    },
    surface: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 2,
    },
    menu: {
      ...StyleSheet.absoluteFillObject,
    },
    hit: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      minWidth: BUTTON_SIZE,
      minHeight: BUTTON_SIZE,
    },
    iconOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
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
    ghostText: {
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
