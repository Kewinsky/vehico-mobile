import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Host, Picker } from "@expo/ui/swift-ui";
import { fixedSize } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
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

  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

  return (
    <View
      style={[styles.field, noMarginTop && styles.fieldNoTop]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, disabled && styles.disabled]}>
        <View style={styles.valueWrap}>
          <Host
            matchContents={{ horizontal: true, vertical: true }}
            colorScheme={themeMode === "dark" ? "dark" : "light"}
            style={styles.nativePickerHost}
          >
            <Picker
              variant="menu"
              label=""
              options={pickerOptions}
              selectedIndex={selectedIndex}
              color={valueColor}
              modifiers={[fixedSize({ horizontal: true, vertical: true })]}
              onOptionSelected={({ nativeEvent }) => {
                onChange(handleSelectIndex(nativeEvent.index));
              }}
            />
          </Host>
        </View>
      </View>
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
      paddingRight: 0,
      paddingLeft: theme.spacing.md,
      minHeight: 48,
      justifyContent: "center",
    },
    valueWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    nativePickerHost: {
      flexShrink: 0,
      maxWidth: "100%",
    },
    disabled: {
      opacity: 0.55,
    },
  });
