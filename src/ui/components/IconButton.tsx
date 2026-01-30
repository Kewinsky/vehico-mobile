import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../ThemeProvider";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "ghost" | "danger";
};

export function IconButton({
  onPress,
  disabled,
  children,
  variant = "ghost",
}: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.base,
        variant === "danger" ? styles.danger : styles.ghost,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </Pressable>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    base: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    inner: {
      alignItems: "center",
      justifyContent: "center",
    },
    ghost: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    },
    pressed: { opacity: 0.9 },
    disabled: { opacity: 0.5 },
  });
