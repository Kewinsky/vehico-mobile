import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../ThemeProvider";
import { Textarea } from "./Textarea";

type Props = ComponentProps<typeof TextInput> & {
  label?: string;
  helperText?: string;
  noMarginTop?: boolean;
  followCursor?: boolean;
};

export function TextField(props: Props) {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const {
    label,
    helperText,
    noMarginTop,
    style,
    multiline,
    followCursor,
    ...inputProps
  } = props;
  const isMultiline = multiline === true;
  const Input = isMultiline && followCursor ? Textarea : TextInput;
  return (
    <View style={[styles.field, noMarginTop && styles.fieldNoTop]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, isMultiline && styles.wrapMultiline]}>
        <Input
          placeholderTextColor={theme.colors.muted}
          keyboardAppearance={mode === "dark" ? "dark" : "light"}
          multiline={multiline}
          textAlignVertical={isMultiline ? "top" : "center"}
          {...inputProps}
          style={[isMultiline ? styles.inputMultiline : styles.input, style]}
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
      fontWeight: "800",
      color: theme.colors.muted,
    },
    wrap: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
    },
    wrapMultiline: {
      minHeight: theme.spacing.xl * 4 - 8,
      padding: theme.spacing.sm,
    },
    input: {
      height: theme.spacing.lg * 2,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
    inputMultiline: {
      minHeight: 100,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
      textAlignVertical: "top",
    },
    helper: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 2,
    },
  });
