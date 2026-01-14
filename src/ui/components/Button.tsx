import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../ThemeProvider';

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'destructive';
}>;

export function Button({ onPress, disabled, variant = 'primary', children }: ButtonProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary'
          ? styles.primary
          : variant === 'destructive'
            ? styles.destructive
            : styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary'
            ? styles.textPrimary
            : variant === 'destructive'
              ? styles.textDestructive
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
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    primary: {
      backgroundColor: theme.colors.fg,
      borderColor: theme.colors.fg,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
    },
    destructive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    text: {
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
    textPrimary: {
      color: theme.colors.bg,
    },
    textGhost: {
      color: theme.colors.fg,
    },
    textDestructive: {
      color: theme.colors.bg,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.9,
    },
  });

