import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import { ComposeOptionMenu } from "./composeContextMenu";
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
  const { theme } = useTheme();
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
      <ComposeOptionMenu
        options={pickerOptions}
        onSelect={(index) => onChange(handleSelectIndex(index))}
        disabled={disabled}
        menuColor={theme.colors.card}
        trigger={
          <View style={[styles.wrap, disabled && styles.disabled]}>
            <Text
              style={[styles.valueText, { color: valueColor }]}
              numberOfLines={1}
            >
              {displayValue}
            </Text>
          </View>
        }
      />
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
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
    },
    wrap: {
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.card,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "flex-end",
      alignSelf: "stretch",
    },
    valueText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    disabled: {
      opacity: 0.55,
    },
  });
