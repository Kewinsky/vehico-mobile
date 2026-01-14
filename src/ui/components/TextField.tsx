import type { ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { theme } from '../theme';

type Props = ComponentProps<typeof TextInput>;

export function TextField(props: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholderTextColor={theme.colors.muted}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  input: {
    height: 48,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.fg,
  },
});

