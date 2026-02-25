import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../ThemeProvider";

type ModalButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
}>;

/**
 * Text-style buttons for native modal header (headerLeft / headerRight).
 * Similar to default React Native header buttons: no border, default font weight, theme-aware.
 */
export function ModalButton({
  onPress,
  disabled = false,
  children,
}: ModalButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.root, disabled && styles.disabled]}
    >
      <Text style={[styles.text, { color: theme.colors.accent }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    minHeight: 36,
  },
  text: {
    fontSize: 17,
    fontWeight: "400",
  },
  disabled: {
    opacity: 0.5,
  },
});
