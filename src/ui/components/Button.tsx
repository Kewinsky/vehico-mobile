import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme';

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}>;

export function Button({ onPress, disabled, variant = 'primary', children }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textGhost]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
  },
});

