import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import { openOptionAlert } from "./openOptionAlert";

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
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={[
        styles.wrap,
        centered && styles.wrapCentered,
        disabled && styles.disabled,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={displayValue}
        disabled={disabled}
        onPress={() =>
          openOptionAlert({
            options: pickerOptions,
            selectedIndex,
            onSelect: (index) => {
              const next = handleSelectIndex(index);
              if (next) onChange(next);
            },
            cancelLabel: t("common.cancel"),
          })
        }
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.valueText} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.fg} />
      </Pressable>
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
    trigger: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
    },
    valueText: {
      flexShrink: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.7,
    },
  });
