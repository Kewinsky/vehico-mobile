import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button as SwiftUIButton,
  Host,
  HStack,
  ProgressView,
  RNHostView,
  Text,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  contentShape,
  controlSize,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  frame,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import type { ButtonProps } from "./Button.types";

export function Button({
  onPress,
  disabled = false,
  variant = "primary",
  color,
  loading = false,
  children,
  style,
}: ButtonProps) {
  const { theme, mode } = useTheme();
  const isDisabled = disabled || loading;
  const isProminent = variant === "primary" || variant === "destructive";
  let nativeStyle: Parameters<typeof buttonStyle>[0] = "glass";
  let buttonTint = theme.colors.fg;

  if (isProminent) {
    nativeStyle = "glassProminent";
    buttonTint =
      variant === "destructive"
        ? theme.colors.danger
        : (color ?? theme.colors.accent);
  } else if (variant === "outlined") {
    nativeStyle = "bordered";
    buttonTint = color ?? theme.colors.accent;
  }
  const contentColor = isProminent ? "#000000" : buttonTint;

  let content: ReactElement;
  if (loading) {
    content = <ProgressView modifiers={[tint(contentColor)]} />;
  } else if (typeof children === "string" || typeof children === "number") {
    content = (
      <Text
        modifiers={[
          font({ textStyle: "body", weight: "semibold" }),
          foregroundStyle(contentColor),
        ]}
      >
        {String(children)}
      </Text>
    );
  } else {
    content = (
      <RNHostView matchContents={{ vertical: true }}>
        <View
          pointerEvents="none"
          style={[styles.content, { gap: theme.spacing.xs }]}
        >
          {children}
        </View>
      </RNHostView>
    );
  }

  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={mode}
      style={[styles.host, style]}
    >
      <SwiftUIButton
        onPress={isDisabled ? undefined : onPress}
        role={variant === "destructive" ? "destructive" : "default"}
        modifiers={[
          buttonStyle(nativeStyle),
          controlSize("large"),
          tint(buttonTint),
          disabledModifier(isDisabled),
          frame({ maxWidth: Infinity, minHeight: 44 }),
        ]}
      >
        <HStack
          spacing={theme.spacing.xs}
          modifiers={[
            foregroundStyle(contentColor),
            frame({ maxWidth: Infinity }),
            contentShape(shapes.rectangle()),
          ]}
        >
          {content}
        </HStack>
      </SwiftUIButton>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 44,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
    width: "100%",
  },
});
