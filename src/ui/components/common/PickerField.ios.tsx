import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { buildMenuPickerState } from "./menuPickerState";
import { openOptionAlert } from "./openOptionAlert";

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
  const { t } = useTranslation();
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${displayValue}` : displayValue}
        disabled={disabled}
        onPress={() =>
          openOptionAlert({
            title: label,
            options: pickerOptions,
            selectedIndex,
            onSelect: (index) => onChange(handleSelectIndex(index)),
            cancelLabel: t("common.cancel"),
          })
        }
        style={({ pressed }) => [
          styles.wrap,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[styles.valueText, { color: valueColor }]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color={valueColor} />
      </Pressable>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
    },
    valueText: {
      flexShrink: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.7,
    },
  });
