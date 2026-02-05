import type { PropsWithChildren } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../ThemeProvider";

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "destructive" | "outlined";
  style?: any;
}>;

export function Button({
  onPress,
  disabled,
  variant = "primary",
  children,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary"
          ? styles.primary
          : variant === "destructive"
          ? styles.destructive
          : variant === "outlined"
          ? styles.outlined
          : styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary"
            ? styles.textPrimary
            : variant === "destructive"
            ? styles.textDestructive
            : variant === "outlined"
            ? styles.textOutlined
            : styles.textGhost,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    base: {
      height: theme.spacing.lg * 2,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      alignSelf: "stretch",
      width: "100%",
    },
    primary: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
      ...(Platform.OS === "ios"
        ? {
            elevation: 4,
          }
        : { elevation: 4 }),
    },
    ghost: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    },
    outlined: {
      backgroundColor: "transparent",
      borderColor: theme.colors.accent,
    },
    destructive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }
        : { elevation: 2 }),
    },
    text: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    textPrimary: {
      color: "#000000", // Always black on accent background
    },
    textGhost: {
      color: theme.colors.fg,
    },
    textOutlined: {
      color: theme.colors.accent,
    },
    textDestructive: {
      color: theme.colors.bg,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
    },
  });
