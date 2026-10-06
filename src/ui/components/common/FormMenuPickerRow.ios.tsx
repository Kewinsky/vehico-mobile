import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";
import type { FormMenuPickerRowProps } from "./FormMenuPickerRow.types";
import { openOptionAlert } from "./openOptionAlert";

export type { FormMenuPickerRowProps } from "./FormMenuPickerRow.types";

export function FormMenuPickerRow({
  icon,
  iconComponent,
  label,
  options,
  selectedIndex,
  onOptionSelected,
  isValueMuted = false,
  error = false,
  disabled = false,
  rowStyle,
}: FormMenuPickerRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;
  const displayValue = options[selectedIndex] ?? "";

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={disabled ? styles.disabled : undefined}
    >
      <CardRow
        style={rowStyle ? [styles.cardRow, rowStyle] : styles.cardRow}
        error={error}
      >
        <View style={styles.pickerRow}>
          <View style={styles.rowLeft}>
            {iconComponent ??
              (icon ? (
                <Ionicons name={icon} size={20} color={theme.colors.accent} />
              ) : null)}
            <Text
              style={[styles.label, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${displayValue}`}
            disabled={disabled}
            onPress={() =>
              openOptionAlert({
                title: label,
                options,
                selectedIndex,
                onSelect: onOptionSelected,
                cancelLabel: t("common.cancel"),
              })
            }
            style={({ pressed }) => [
              styles.valueWrap,
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
      </CardRow>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    disabled: {
      opacity: 0.55,
    },
    cardRow: {
      paddingRight: 0,
    },
    pickerRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
      maxWidth: "55%",
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      flexShrink: 1,
    },
    valueWrap: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    valueText: {
      flexShrink: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    pressed: {
      opacity: 0.7,
    },
  });
