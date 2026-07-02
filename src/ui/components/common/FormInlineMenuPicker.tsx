import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Host, Picker } from "@expo/ui/swift-ui";
import { fixedSize } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import { openAlertPicker } from "./openAlertPicker";

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
  const { t } = useTranslation();
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

  if (Platform.OS === "ios") {
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

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        openAlertPicker({
          cancelLabel: t("common.cancel"),
          choices: options.map((option) => ({
            label: getLabel(option),
            onPress: () => onChange(option),
          })),
        });
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.androidPill,
        centered && styles.androidPillCentered,
        { backgroundColor: theme.colors.accent },
        pressed && !disabled && { opacity: 0.85 },
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.androidPillText} numberOfLines={1}>
        {getLabel(value)}
      </Text>
    </Pressable>
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
    androidPill: {
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      marginLeft: theme.spacing.sm,
    },
    androidPillCentered: {
      marginLeft: 0,
      alignSelf: "center",
    },
    androidPillText: {
      color: "#000000",
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.small,
    },
  });
