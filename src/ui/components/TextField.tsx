import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

type Props = ComponentProps<typeof TextInput> & {
  label?: string;
  helperText?: string;
  noMarginTop?: boolean;
};

export function TextField(props: Props) {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const { label, helperText, noMarginTop, style, ...inputProps } = props;
  return (
    <View style={[styles.field, noMarginTop && styles.fieldNoTop]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.wrap}>
        <TextInput
          placeholderTextColor={theme.colors.muted}
          keyboardAppearance={mode === "dark" ? "dark" : "light"}
          {...inputProps}
          style={[styles.input, style]}
        />
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    field: {
      marginTop: theme.spacing.sm,
    },
    fieldNoTop: {
      marginTop: 0,
    },
    label: {
      marginBottom: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      fontWeight: '800',
      color: theme.colors.muted,
    },
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
    helper: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      lineHeight: 18,
    },
  });

