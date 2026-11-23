import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Picker, Text } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  disabled as disabledModifier,
  frame,
  labelsHidden,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import type { AppTheme } from "../../theme";
import type { FormInlineMenuPickerProps } from "./FormInlineMenuPicker.types";

export function FormInlineMenuPicker<T extends string>({
  value,
  options,
  getLabel,
  onChange,
  disabled = false,
  centered = false,
}: FormInlineMenuPickerProps<T>) {
  const { theme, mode } = useTheme();
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
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={[
        styles.wrap,
        centered && styles.wrapCentered,
        disabled && styles.disabled,
      ]}
    >
      <Host
        matchContents
        colorScheme={mode}
        alignment="trailing"
        style={{ minHeight: 44 }}
      >
        <Picker
          label={displayValue}
          selection={selectedIndex}
          onSelectionChange={(index) => {
            const next = handleSelectIndex(index);
            if (next !== null) onChange(next);
          }}
          modifiers={[
            pickerStyle("menu"),
            labelsHidden(),
            buttonStyle("glass"),
            tint(theme.colors.fg),
            disabledModifier(disabled),
            accessibilityLabel(displayValue),
            frame({ minHeight: 44 }),
          ]}
        >
          {pickerOptions.map((option, index) => (
            <Text key={index} modifiers={[tag(index)]}>
              {option}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      flexShrink: 0,
      maxWidth: "100%",
      marginLeft: theme.spacing.sm,
    },
    wrapCentered: {
      marginLeft: 0,
      alignSelf: "center",
    },
    disabled: {
      opacity: 0.55,
    },
  });
