import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../ThemeProvider";
import { IOSMenuPickerControl } from "./IOSMenuPickerControl";
import { buildMenuPickerState } from "./menuPickerState";

type Props<T extends string> = {
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  noMarginTop?: boolean;
  placeholder?: string;
};

export function PickerField<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
  disabled,
  noMarginTop,
  placeholder,
}: Props<T>) {
  const { theme, mode: themeMode } = useTheme();
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

  const displayText = pickerOptions[selectedIndex] ?? "";
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

  return (
    <View
      style={[styles.field, noMarginTop && styles.fieldNoTop]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, disabled && styles.disabled]}>
        <IOSMenuPickerControl
          displayText={displayText}
          valueColor={valueColor}
          options={pickerOptions}
          onSelect={(index) => onChange(handleSelectIndex(index))}
          colorScheme={themeMode === "dark" ? "dark" : "light"}
          wrapStyle={styles.menuWrap}
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    field: {
      marginTop: theme.spacing.md,
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
    },
    menuWrap: {
      flex: 1,
    },
    disabled: {
      opacity: 0.55,
    },
  });
