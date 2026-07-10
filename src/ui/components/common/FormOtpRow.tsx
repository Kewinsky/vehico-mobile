import type { ComponentProps, ReactNode } from "react";
import { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";

export type FormOtpRowProps = TextInputProps & {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  trailing?: ReactNode;
  rowStyle?: ViewStyle;
  error?: boolean;
};

export function FormOtpRow({
  icon = "keypad-outline",
  iconComponent,
  label,
  trailing,
  editable = true,
  style,
  rowStyle,
  error = false,
  value,
  keyboardType = "number-pad",
  textContentType = "oneTimeCode",
  autoComplete = "one-time-code",
  ...inputProps
}: FormOtpRowProps) {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const inputRef = useRef<TextInput>(null);
  const isEditable = editable !== false;
  const hasValue = value != null && String(value).length > 0;

  const focusInput = () => {
    if (isEditable) inputRef.current?.focus();
  };

  return (
    <CardRow style={rowStyle} error={error}>
      <Pressable
        onPress={focusInput}
        disabled={!isEditable}
        style={({ pressed }) => [
          styles.rowLeft,
          { opacity: pressed && isEditable ? 0.75 : 1 },
        ]}
      >
        {iconComponent ??
          (icon ? (
            <Ionicons name={icon} size={20} color={theme.colors.accent} />
          ) : null)}
        <Text
          style={[styles.label, { color: theme.colors.muted }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
      <TextInput
        ref={inputRef}
        editable={editable}
        value={value}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        placeholderTextColor={theme.colors.muted}
        keyboardAppearance={mode === "dark" ? "dark" : "light"}
        {...inputProps}
        style={[
          styles.input,
          styles.otpInput,
          hasValue && styles.otpInputTyped,
          {
            color: theme.colors.fg,
            textAlign: "right",
          },
          style,
        ]}
      />
      {trailing}
    </CardRow>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
      marginRight: theme.spacing.xs,
    },
    otpInput: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    otpInputTyped: {
      letterSpacing: 4,
    },
  });
