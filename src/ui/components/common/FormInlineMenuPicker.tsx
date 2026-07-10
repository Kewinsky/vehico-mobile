import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { fixedSize, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

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
          selection={selectedIndex}
          modifiers={[
            pickerStyle("menu"),
            fixedSize({ horizontal: true, vertical: true }),
          ]}
          onSelectionChange={(selection) => {
            const next = handleSelectIndex(Number(selection));
            if (next) onChange(next);
          }}
        >
          {pickerOptions.map((option, index) => (
            <SwiftUIText key={`${option}-${index}`} modifiers={[tag(index)]}>
              {option}
            </SwiftUIText>
          ))}
        </Picker>
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
