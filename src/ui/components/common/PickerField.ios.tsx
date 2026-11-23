import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  disabled as disabledModifier,
  frame,
  labelsHidden,
  padding,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import type { AppTheme } from "../../theme";
import type { PickerFieldProps } from "./PickerField.types";

export function PickerField<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
  disabled,
  noMarginTop,
  placeholder,
}: PickerFieldProps<T>) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { pickerOptions, selectedIndex, isValueMuted, handleSelectIndex } =
    useMemo(
      () =>
        buildMenuPickerState({
          value,
          options,
          getLabel,
          placeholderLabel: placeholder,
        }),
      [value, options, getLabel, placeholder],
    );

  const displayValue = pickerOptions[selectedIndex] ?? "";
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

  return (
    <View
      style={[styles.field, noMarginTop && styles.fieldNoTop]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Host
        ignoreSafeArea="all"
        matchContents={{ vertical: true }}
        colorScheme={mode}
        alignment="trailing"
        style={[styles.wrap, disabled && styles.disabled]}
      >
        <Picker
          label={label || displayValue}
          selection={selectedIndex}
          onSelectionChange={(index) => onChange(handleSelectIndex(index))}
          modifiers={[
            pickerStyle("menu"),
            labelsHidden(),
            buttonStyle("glass"),
            tint(valueColor),
            disabledModifier(disabled || pickerOptions.length === 0),
            accessibilityLabel(label || displayValue),
            frame({ minHeight: 44 }),
            padding({ horizontal: theme.spacing.md }),
          ]}
        >
          {pickerOptions.map((option, index) => (
            <SwiftUIText key={index} modifiers={[tag(index)]}>
              {option}
            </SwiftUIText>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    field: {
      marginTop: theme.spacing.sm,
    },
    fieldNoTop: {
      marginTop: 0,
    },
    label: {
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
    },
    wrap: {
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.card,
      minHeight: 48,
    },
    disabled: {
      opacity: 0.55,
    },
  });
