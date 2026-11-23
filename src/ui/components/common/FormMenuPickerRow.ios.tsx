import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
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
import { CardRow } from "./Card";
import type { FormMenuPickerRowProps } from "./FormMenuPickerRow.types";
import type { AppTheme } from "../../theme";

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
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

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
          <Host
            ignoreSafeArea="all"
            matchContents={{ vertical: true }}
            colorScheme={mode}
            alignment="trailing"
            style={styles.valueWrap}
          >
            <Picker
              label={label}
              selection={selectedIndex}
              onSelectionChange={onOptionSelected}
              modifiers={[
                pickerStyle("menu"),
                labelsHidden(),
                buttonStyle("glass"),
                tint(valueColor),
                disabledModifier(disabled || options.length === 0),
                accessibilityLabel(label),
                frame({ minHeight: 44 }),
              ]}
            >
              {options.map((option, index) => (
                <SwiftUIText key={index} modifiers={[tag(index)]}>
                  {option}
                </SwiftUIText>
              ))}
            </Picker>
          </Host>
        </View>
      </CardRow>
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
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
      marginHorizontal: theme.spacing.md,
    },
  });
