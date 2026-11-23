import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Host,
  Button as SwiftUIButton,
  Menu as SwiftUIMenu,
  RNHostView,
  Divider,
} from "@expo/ui/swift-ui";

import { useTheme } from "../../ThemeProvider";
import type {
  SourcePickerMenuItem,
  SourcePickerMenuProps,
} from "./SourcePickerMenu.types";

export type {
  SourcePickerMenuActionItem,
  SourcePickerMenuDividerItem,
  SourcePickerMenuItem,
} from "./SourcePickerMenu.types";

function isDividerItem(
  item: SourcePickerMenuItem,
): item is { id: string; type: "divider" } {
  return item.type === "divider";
}

function makeGhostTriggerStyles(theme: {
  spacing: any;
  radius: any;
  typography: any;
  colors: any;
}) {
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
    <View
      style={[styles.ghost, disabled && styles.disabled, style]}
      collapsable={false}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

function renderMenuItems(items: SourcePickerMenuItem[]) {
  return items.map((item) => {
    if (isDividerItem(item)) {
      return <Divider key={item.id} />;
    }

    if (item.items?.length) {
      return (
        <SwiftUIMenu
          key={item.id}
          label={item.label}
          systemImage={item.systemImage}
        >
          {renderMenuItems(item.items)}
        </SwiftUIMenu>
      );
    }

    return (
      <SwiftUIButton
        key={item.id}
        systemImage={item.systemImage}
        role={item.role}
        onPress={item.onPress}
        label={item.label}
      />
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
  const { mode: themeMode } = useTheme();

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

    return (
      <View style={{ alignSelf: "stretch", width: "100%" }}>
        <Host
          matchContents={{ vertical: true }}
          style={{ width: "100%" }}
          colorScheme={themeMode === "dark" ? "dark" : "light"}
        >
          <SwiftUIMenu
            label={
              <RNHostView matchContents={{ vertical: true }}>
                <GhostMenuTrigger
                  label={triggerLabel}
                  style={triggerStyle}
                />
              </RNHostView>
            }
          >
            {renderMenuItems(items)}
          </SwiftUIMenu>
        </Host>
      </View>
    );
  }

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <Host matchContents colorScheme={themeMode === "dark" ? "dark" : "light"}>
      <SwiftUIMenu
        label={
          <RNHostView matchContents>
            <View>{children}</View>
          </RNHostView>
        }
      >
        {renderMenuItems(items)}
      </SwiftUIMenu>
    </Host>
  );
}
