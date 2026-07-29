import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import { ComposeOptionMenu } from "./composeContextMenu";
import type { FormInlineMenuPickerProps } from "./FormInlineMenuPicker.types";

export function FormInlineMenuPicker<T extends string>({
  value,
  options,
  getLabel,
  onChange,
  disabled = false,
  centered = false,
}: FormInlineMenuPickerProps<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { pickerOptions, selectedIndex, handleSelectIndex } = useMemo(
    () =>
      buildMenuPickerState({
        value,
        options,
        getLabel,
      }),
    [value, options, getLabel],
  );

  const displayValue = pickerOptions[selectedIndex] ?? "";

  return (
    <View style={centered ? styles.outerCentered : undefined}>
      <ComposeOptionMenu
        options={pickerOptions}
        onSelect={(index) => {
          const next = handleSelectIndex(index);
          if (next) onChange(next);
        }}
        disabled={disabled}
        menuColor={theme.colors.card}
        trigger={
          <Text
            style={[
              styles.wrap,
              centered && styles.wrapCentered,
              disabled && styles.disabled,
              styles.valueText,
              { color: theme.colors.fg },
            ]}
            numberOfLines={1}
          >
            {displayValue}
          </Text>
        }
      />
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    outerCentered: {
      alignSelf: "center",
    },
    wrap: {
      flexShrink: 0,
      maxWidth: "100%",
      marginLeft: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
    },
    wrapCentered: {
      marginLeft: 0,
      alignSelf: "center",
    },
    valueText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    disabled: {
      opacity: 0.55,
    },
  });
