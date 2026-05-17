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

export type FormInputRowProps = TextInputProps & {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  trailing?: ReactNode;
  rowStyle?: ViewStyle;
  /** OTP code field: larger type; letter spacing only while typing (not on placeholder). */
  variant?: "default" | "otp";
};

export function FormInputRow({
  icon,
  iconComponent,
  label,
  trailing,
  editable = true,
  style,
  rowStyle,
  variant = "default",
  value,
  ...inputProps
}: FormInputRowProps) {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const inputRef = useRef<TextInput>(null);
  const isEditable = editable !== false;
  const isOtp = variant === "otp";
  const hasValue = value != null && String(value).length > 0;

  const focusInput = () => {
    if (isEditable) inputRef.current?.focus();
  };

  return (
    <CardRow style={rowStyle}>
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
        placeholderTextColor={theme.colors.muted}
        keyboardAppearance={mode === "dark" ? "dark" : "light"}
        {...inputProps}
        style={[
          styles.input,
          {
            color: theme.colors.fg,
            textAlign: "right",
            letterSpacing: 0,
          },
          isOtp && styles.otpInput,
          isOtp && hasValue && styles.otpInputTyped,
          style,
        ]}
      />
      {trailing}
    </CardRow>
  );
}

const makeStyles = (theme: any) =>
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
    },
    otpInput: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    otpInputTyped: {
      letterSpacing: 4,
    },
  });
