import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";
import { ComposeOptionMenu } from "./composeContextMenu";
import type { FormMenuPickerRowProps } from "./FormMenuPickerRow.types";

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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;
  const displayValue = options[selectedIndex] ?? "";

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={disabled ? styles.disabled : undefined}
    >
      <CardRow style={rowStyle} error={error}>
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
          <View style={styles.valueWrap}>
            <ComposeOptionMenu
              options={options}
              onSelect={onOptionSelected}
              disabled={disabled}
              menuColor={theme.colors.card}
              trigger={
                <Text
                  style={[styles.valueText, { color: valueColor }]}
                  numberOfLines={1}
                >
                  {displayValue}
                </Text>
              }
            />
          </View>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingLeft: theme.spacing.sm,
    },
    valueText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
  });
