import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "../../ThemeProvider";

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "destructive" | "outlined";
  /** Primary/outlined fill and border; defaults to theme accent. */
  color?: string;
  loading?: boolean;
  style?: any;
}>;

export function Button({
  onPress,
  disabled,
  variant = "primary",
  color,
  loading = false,
  children,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const accent = color ?? theme.colors.accent;
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === "primary" || variant === "destructive" ? "#000000" : accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary"
          ? [styles.primary, { backgroundColor: accent, borderColor: accent }]
          : variant === "destructive"
            ? styles.destructive
            : variant === "outlined"
              ? [styles.outlined, { borderColor: accent }]
              : styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : typeof children === "string" || typeof children === "number" ? (
        <Text
          style={[
            styles.text,
            variant === "primary"
              ? styles.textPrimary
              : variant === "destructive"
                ? styles.textDestructive
                : variant === "outlined"
                  ? [styles.textOutlined, { color: accent }]
                  : styles.textGhost,
          ]}
        >
          {children}
        </Text>
      ) : (
        <View style={styles.contentRow}>{children}</View>
      )}
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
      ...(Platform.OS === "ios"
        ? {
            elevation: 4,
          }
        : { elevation: 4 }),
    },
    ghost: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: "transparent",
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
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
    },
    textPrimary: {
      color: "#000000", // Always black on accent background
    },
    textGhost: {
      color: theme.colors.fg,
    },
    textOutlined: {},
    textDestructive: {
      color: "#000000",
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
    },
    contentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
      maxWidth: "100%",
    },
  });
