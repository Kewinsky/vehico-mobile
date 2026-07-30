import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Picker } from "@expo/ui/swift-ui";
import { fixedSize } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
  disabled?: boolean;
  centered?: boolean;
};

export function FormInlineMenuPicker<T extends string>({
  value,
  options,
  getLabel,
  onChange,
  disabled = false,
  centered = false,
}: Props<T>) {
  const { theme, mode: themeMode } = useTheme();
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
        matchContents={{ horizontal: true, vertical: true }}
        colorScheme={themeMode === "dark" ? "dark" : "light"}
        style={styles.host}
      >
        <Picker
          variant="menu"
          label=""
          options={pickerOptions}
          selectedIndex={selectedIndex}
          color={theme.colors.fg}
          modifiers={[fixedSize({ horizontal: true, vertical: true })]}
          onOptionSelected={({ nativeEvent }) => {
            const next = handleSelectIndex(nativeEvent.index);
            if (next) onChange(next);
          }}
        />
      </Host>
    </View>
  );
}

const makeStyles = (theme: any) =>
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
    host: {
      flexShrink: 0,
      maxWidth: "100%",
    },
    disabled: {
      opacity: 0.55,
    },
  });
